$Subnet = "192.168.1"
$FoundIPs = @()

Write-Host "Scanning $Subnet.1 to $Subnet.254 for port 554 (RTSP)..."

1..254 | ForEach-Object {
    $ip = "$Subnet.$_"
    if (Test-Connection -ComputerName $ip -Count 1 -Quiet -ErrorAction SilentlyContinue) {
        if (Test-NetConnection -ComputerName $ip -Port 554 -InformationLevel Quiet -WarningAction SilentlyContinue) {
            Write-Host "!!! Found RTSP on $ip !!!"
            $FoundIPs += $ip
        } else {
            Write-Host "Live device at $ip (Port 554 closed)"
        }
    }
}

if ($FoundIPs.Count -eq 0) {
    Write-Host "No RTSP devices found on this subnet."
} else {
    Write-Host "`nSummary of RTSP devices: "
    $FoundIPs | ForEach-Object { Write-Host " - $_" }
}
