param([int]$Start, [int]$End, [int]$MinWidth = 1400)
# Save each new large clipboard image as raw/NN.png (NN = Start..End). Smaller images are left alone,
# because other sessions share this clipboard. Usage: powershell -STA -File clip_watch.ps1 1 14
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot "raw"
New-Item -ItemType Directory -Force $dir | Out-Null
$n = $Start
$deadline = (Get-Date).AddHours(3)
while ($n -le $End -and (Get-Date) -lt $deadline) {
  try { $img = [System.Windows.Forms.Clipboard]::GetImage() } catch { $img = $null }
  if ($img -and $img.Width -ge $MinWidth) {
    $name = "{0:D2}" -f $n
    $img.Save((Join-Path $dir "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    [System.Windows.Forms.Clipboard]::Clear()
    "$(Get-Date -Format HH:mm:ss) saved $name $($img.Width)x$($img.Height)"
    $n++
  }
  Start-Sleep -Milliseconds 400
}
"stopped at $n"
