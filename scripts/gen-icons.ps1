Add-Type -AssemblyName System.Drawing

$outDir = Join-Path (Get-Location) 'public\icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Icon {
  param([int]$size, [string]$path, [double]$paddingRatio, [bool]$opaque)

  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $c1 = [System.Drawing.Color]::FromArgb(255, 108, 92, 231)
  $c2 = [System.Drawing.Color]::FromArgb(255, 0, 206, 201)

  if ($opaque) {
    $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
    $g.Clear($c1)
  } else {
    $g.Clear([System.Drawing.Color]::Transparent)
    $pad = [int]([double]$size * $paddingRatio)
    $w = [int]($size - (2 * $pad))
    $rect = [System.Drawing.Rectangle]::new($pad, $pad, $w, $w)
  }

  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, [float]45)

  if ($opaque) {
    $g.FillRectangle($brush, $rect)
  } else {
    $radius = [int]($rect.Width * 0.24)
    $d = [int]($radius * 2)
    $gp = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $gp.AddArc($rect.X, $rect.Y, $d, $d, [float]180, [float]90)
    $gp.AddArc(($rect.Right - $d), $rect.Y, $d, $d, [float]270, [float]90)
    $gp.AddArc(($rect.Right - $d), ($rect.Bottom - $d), $d, $d, [float]0, [float]90)
    $gp.AddArc($rect.X, ($rect.Bottom - $d), $d, $d, [float]90, [float]90)
    $gp.CloseFigure()
    $g.FillPath($brush, $gp)
  }

  $ruble = [string][char]0x20BD
  $fontSize = [float]($rect.Width * 0.58)
  $font = [System.Drawing.Font]::new('Arial', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $center = [System.Drawing.RectangleF]::new([float]$rect.X, [float]$rect.Y, [float]$rect.Width, [float]$rect.Height)
  $g.DrawString($ruble, $font, $white, $center, $sf)

  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Created $path"
}

New-Icon -size 192 -path (Join-Path $outDir 'pwa-192.png') -paddingRatio 0.0 -opaque $false
New-Icon -size 512 -path (Join-Path $outDir 'pwa-512.png') -paddingRatio 0.0 -opaque $false
New-Icon -size 512 -path (Join-Path $outDir 'maskable-512.png') -paddingRatio 0.12 -opaque $false
New-Icon -size 180 -path (Join-Path $outDir 'apple-touch-icon.png') -paddingRatio 0.0 -opaque $true
