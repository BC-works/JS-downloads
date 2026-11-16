# Jyotish Studio downloads

Windows and Android installers are available from **[Releases](https://github.com/BC-works/JS-downloads/releases)**.

- **Windows 10/11 x64:** download `Jyotish-Studio-Setup-3.1.0.exe` and run it. No admin rights are needed. The app retains the existing Jyotish Studio Offline profile.
- **Android 8.0+:** download `Jyotish-Studio-Next-Android.apk` and install it over Jyotish Studio Next without uninstalling. Use an up-to-date Android System WebView.

This first manual install enables future in-app updates. Windows shows release notes before downloading, progress at the top right, then Restart to install. Android offers Download/Later in a bottom bar and an explicit Install action; Later waits until the next fresh launch. Android requires system installation confirmation.

The world atlas and calculations work offline, including charts back to 2000 BCE and Lahiri Transit search through 2026 CE. Public-person lookup needs internet. Saved Charts and History stay on the device.

Source is in the owner’s private `BC-works/jyotish` repository. This public repository holds release metadata and installer downloads, never private keys, tokens or personal charts. The stable feed is `updates/latest.json`; clients verify its RSA-SHA256 signature and downloaded file hashes. SHA256SUMS accompanies each release.

Windows installation, app launch, 2000 BCE calculation, updater controls and Saved Charts/History preservation through reinstall passed on a Windows GitHub Actions runner. Android packaged-asset, signature and update-control checks passed; its system installer still needs a physical-device check.

The Windows installer has no Authenticode publisher certificate, so Windows may show a publisher/trust warning. Update metadata and downloaded installers are independently authenticated by the app.
