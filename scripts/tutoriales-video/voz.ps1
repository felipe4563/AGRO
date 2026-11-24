param(
  [Parameter(Mandatory = $true)][string]$Texto,
  [Parameter(Mandatory = $true)][string]$Salida
)
# Genera un .wav con la voz de Windows en español (Microsoft Helena Desktop).
# Lo usa motor.cjs por cada paso del guion — motor.cjs ya cachea por texto
# en voces/, así que este script no sabe nada de caché, solo genera.

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Helena Desktop')
$synth.Rate = 1

$carpeta = Split-Path -Parent $Salida
if (-not (Test-Path $carpeta)) { New-Item -ItemType Directory -Path $carpeta -Force | Out-Null }

$formato = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
  22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono
)
$synth.SetOutputToWaveFile($Salida, $formato)
$synth.Speak($Texto)
$synth.Dispose()
