# Jyotish Studio downloads

Windows and Android installers are available from **[Releases](https://github.com/BC-works/JS-downloads/releases)**.

- **Windows10/11 x64:** download `Jyotish-Studio-Setup-3.1.0.exe` and run it. No admin rights are needed. The app retains the existing Jyotish Studio Offline profile.
- **Android8.0+:** download `Jyotish-Studio-Next-Android.apk` and install it over Jyotish Studio Next without uninstalling. Use an up-to-date Android System WebView.

This first manual install enables future in-app updates. Windows shows release notes before downloading, progress at the top right, then Restart to install. Android offers Download/Later in a bottom bar and an explicit Install action; Later waits until the next fresh launch. Android requires system installation confirmation.

The world atlas and calculations work offline, including charts back to2000BCE and Lahiri Transit search through2026CE. Public-person lookup needs internet. Saved Charts and History stay on the device.

Source is in the owner’s private `BC-works/jyotish` repository. This public repository holds release metadata and installer downloads, never private keys, tokens or personal charts. The stable feed is `updates/latest.json`; clients verify its RSA-SHA256 signature and downloaded file hashes. SHA256SUMS accompanies each release.

Windows has no paid Authenticode certificate and may show a publisher/trust warning. Linux packaged-app and installer-structure tests are distinct from running the installer on Windows or testing Android’s OS installer on a physical phone.
