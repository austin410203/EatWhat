"""Tabelog 英文站（tabelog.com/en/）禮貌抓取：每次間隔 3 秒，快取在 raw/，抓過不重抓。"""
import os, sys, time, urllib.request
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36"
def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return open(path, encoding='utf-8').read()
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en,ja;q=0.8'})
            s = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
            open(path, 'w', encoding='utf-8').write(s)
            time.sleep(3)
            return s
        except Exception as e:
            print('retry', url, e, file=sys.stderr); time.sleep(10 * (i + 1))
    return ''
