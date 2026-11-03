"""Manual App Store signing for CI through the App Store Connect API (no Xcode account, no -allowProvisioningUpdates:
Xcode's cloud provisioning answers 401 on listTeams for API keys on the GitHub runners, while the REST API works).

  python3 scripts/asc_signing.py setup     # temp distribution certificate + App Store profile, installed for xcodebuild
  python3 scripts/asc_signing.py cleanup   # removes only the temporary keychain on the runner

The certificate and profile are KEPT. Revoking the distribution certificate after upload makes every build signed
with it fail App Review with ITMS-90035 "Invalid Signature" (2026-10-28, Chromafall build 4), so never revoke a
certificate while one of its builds is in TestFlight or review. Apple allows 3 distribution certificates per team:
when that limit is hit, setup stops and an owner revokes an old one by hand (after its builds are approved).

Env: ASC_KEY_ID, ASC_ISSUER_ID, ~/private_keys/AuthKey_<ASC_KEY_ID>.p8, TEAM, BUNDLE, RUNNER_TEMP, GITHUB_ENV.
setup writes PROFILE_NAME / PROFILE_UUID / CERT_ID / PROFILE_ID to GITHUB_ENV and switches the App target's
Release configuration to manual signing (only the App target, so the SwiftPM plugin targets stay unsigned).
"""
import base64, json, os, pathlib, re, subprocess, sys, time, urllib.request, urllib.error
import jwt   # pip install pyjwt cryptography

API = 'https://api.appstoreconnect.apple.com/v1'
KEY_ID, ISSUER = os.environ['ASC_KEY_ID'], os.environ['ASC_ISSUER_ID']
BUNDLE = os.environ.get('BUNDLE', 'com.austin410203.eatwhat')
TMP = pathlib.Path(os.environ.get('RUNNER_TEMP', '/tmp')) / 'signing'
PBX = pathlib.Path('ios/App/App.xcodeproj/project.pbxproj')
KEYCHAIN = 'ci-signing.keychain-db'


def token():
    key = (pathlib.Path.home() / 'private_keys' / f'AuthKey_{KEY_ID}.p8').read_text()
    now = int(time.time())
    return jwt.encode({'iss': ISSUER, 'iat': now, 'exp': now + 1200, 'aud': 'appstoreconnect-v1'}, key,
                      algorithm='ES256', headers={'kid': KEY_ID, 'typ': 'JWT'})


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {path} -> {e.code}: {e.read().decode()[:800]}')


def sh(*args, **kw):
    print('+', ' '.join(str(a) for a in args))
    subprocess.run([str(a) for a in args], check=True, **kw)


def env_out(**kv):
    with open(os.environ['GITHUB_ENV'], 'a') as f:
        for k, v in kv.items():
            f.write(f'{k}={v}\n')


def setup():
    TMP.mkdir(parents=True, exist_ok=True)
    bundles = call('GET', f'/bundleIds?filter[identifier]={BUNDLE}&limit=20')['data']
    bundle = next((b for b in bundles if b['attributes']['identifier'] == BUNDLE), None)
    if not bundle:   # 第一次建置：幫忙註冊 Bundle ID（App Store Connect 建 App 時就選得到）
        bundle = call('POST', '/bundleIds', {'data': {'type': 'bundleIds', 'attributes': {
            'identifier': BUNDLE, 'name': 'EAT WHAT', 'platform': 'IOS'}}})['data']
        print('registered bundle id', BUNDLE)

    # private key + CSR stay on the runner (a new certificate per run; old ones are revoked by hand only)
    key, csr = TMP / 'dist.key', TMP / 'dist.csr'
    sh('/usr/bin/openssl', 'req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', csr,
       '-subj', '/CN=Empty Office CI/O=Empty Office/C=TW')
    csr_b64 = ''.join(l for l in csr.read_text().splitlines() if not l.startswith('-----'))
    have = call('GET', '/certificates?filter[certificateType]=DISTRIBUTION&limit=50')['data']
    if len(have) >= 3:
        sys.exit('Apple allows 3 distribution certificates and the team already has '
                 f'{len(have)}. Revoke an old one in Certificates, Identifiers & Profiles, but only once '
                 'none of its builds are in TestFlight or App Review (a revoked certificate = ITMS-90035).')
    cert = call('POST', '/certificates', {'data': {'type': 'certificates', 'attributes': {
        'csrContent': csr_b64, 'certificateType': 'DISTRIBUTION'}}})['data']
    env_out(CERT_ID=cert['id'])
    der = TMP / 'dist.cer'
    der.write_bytes(base64.b64decode(cert['attributes']['certificateContent']))

    name = f"CI {BUNDLE} {os.environ.get('GITHUB_RUN_ID', int(time.time()))}"
    prof = call('POST', '/profiles', {'data': {'type': 'profiles',
        'attributes': {'name': name, 'profileType': 'IOS_APP_STORE'},
        'relationships': {'bundleId': {'data': {'type': 'bundleIds', 'id': bundle['id']}},
                          'certificates': {'data': [{'type': 'certificates', 'id': cert['id']}]}}}})['data']
    uuid = prof['attributes']['uuid']
    env_out(PROFILE_ID=prof['id'], PROFILE_NAME=name, PROFILE_UUID=uuid)
    for d in ('Library/MobileDevice/Provisioning Profiles', 'Library/Developer/Xcode/UserData/Provisioning Profiles'):
        p = pathlib.Path.home() / d
        p.mkdir(parents=True, exist_ok=True)
        (p / f'{uuid}.mobileprovision').write_bytes(base64.b64decode(prof['attributes']['profileContent']))

    # temporary keychain with the identity (LibreSSL's pkcs12 output is what `security import` accepts)
    pem, p12 = TMP / 'dist.pem', TMP / 'dist.p12'
    sh('/usr/bin/openssl', 'x509', '-inform', 'DER', '-in', der, '-out', pem)
    sh('/usr/bin/openssl', 'pkcs12', '-export', '-inkey', key, '-in', pem, '-out', p12, '-passout', 'pass:ci')
    wwdr = TMP / 'AppleWWDRCAG3.cer'
    urllib.request.urlretrieve('https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer', wwdr)
    sh('security', 'create-keychain', '-p', 'ci', KEYCHAIN)
    sh('security', 'set-keychain-settings', '-lut', '21600', KEYCHAIN)
    sh('security', 'unlock-keychain', '-p', 'ci', KEYCHAIN)
    sh('security', 'import', wwdr, '-k', KEYCHAIN, '-T', '/usr/bin/codesign')
    sh('security', 'import', p12, '-k', KEYCHAIN, '-P', 'ci', '-T', '/usr/bin/codesign', '-T', '/usr/bin/security')
    sh('security', 'set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s', '-k', 'ci', KEYCHAIN)
    current = subprocess.run(['security', 'list-keychains', '-d', 'user'], capture_output=True, text=True).stdout
    sh('security', 'list-keychains', '-d', 'user', '-s', KEYCHAIN, *[k.strip().strip('"') for k in current.split()])
    sh('security', 'find-identity', '-v', '-p', 'codesigning', KEYCHAIN)

    # App target, Release: manual signing with this profile (the block that carries the bundle id)
    pbx = PBX.read_text()
    blocks = re.findall(r'/\* Release \*/ = \{\n\t\t\tisa = XCBuildConfiguration;.*?name = Release;', pbx, re.S)
    app = next(b for b in blocks if f'PRODUCT_BUNDLE_IDENTIFIER = {BUNDLE};' in b)
    signed = app.replace('CODE_SIGN_STYLE = Automatic;',
                         'CODE_SIGN_STYLE = Manual;\n\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";\n'
                         f'\t\t\t\tDEVELOPMENT_TEAM = {os.environ["TEAM"]};\n'
                         f'\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "{name}";')
    assert signed != app, 'App Release config has no CODE_SIGN_STYLE = Automatic'
    PBX.write_text(pbx.replace(app, signed))
    print('signing ready:', name, uuid)


def cleanup():
    # only the runner's keychain: the certificate and profile must stay valid while the build is reviewed
    subprocess.run(['security', 'delete-keychain', KEYCHAIN])
    print('kept certificate', os.environ.get('CERT_ID'), 'and profile', os.environ.get('PROFILE_ID'))


if __name__ == '__main__':
    {'setup': setup, 'cleanup': cleanup}[sys.argv[1]]()
