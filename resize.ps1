$sourceImage = "C:\Users\paree\.gemini\antigravity-ide\brain\259e0eb7-4a91-4c41-b553-d180237fbbb3\media__1780991644348.png"
$resFolder = "c:\Users\paree\OneDrive\Desktop\bluevolt\android-app\app\src\main\res"

Add-Type -AssemblyName System.Drawing
$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

$srcImg = [System.Drawing.Image]::FromFile($sourceImage)

foreach ($key in $sizes.Keys) {
    $size = $sizes[$key]
    $destFolder = "$resFolder\$key"
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder | Out-Null
    }
    
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($srcImg, 0, 0, $size, $size)
    $graphics.Dispose()
    
    $bmp.Save("$destFolder\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save("$destFolder\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    
    if (Test-Path "$destFolder\ic_launcher.webp") { Remove-Item "$destFolder\ic_launcher.webp" }
    if (Test-Path "$destFolder\ic_launcher_round.webp") { Remove-Item "$destFolder\ic_launcher_round.webp" }
}
$srcImg.Dispose()

$anydpi = "$resFolder\mipmap-anydpi-v26"
if (Test-Path $anydpi) {
    Remove-Item -Recurse -Force $anydpi
}

Write-Host "Done"
