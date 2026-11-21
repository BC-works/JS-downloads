# Jyotish Studio downloads

Windows and Android installers are available from **[Releases](https://github.com/BC-works/JS-downloads/releases)**.

- **Windows 10/11 x64** can use the [3.4.5 installer](https://github.com/BC-works/JS-downloads/releases/download/v3.4.5/Jyotish-Studio-Setup-3.4.5.exe). It runs with a standard user account and retains the existing Jyotish Studio Offline profile.
- **Android 8.0+** can use the [3.4.2 APK](https://github.com/BC-works/JS-downloads/releases/download/v3.4.2/Jyotish-Studio-Next-Android.apk). Install it over Jyotish Studio Next to keep the app’s existing data. Use an up-to-date Android System WebView.

Versions without an updater need one manual install to enable future in-app updates. Windows shows release notes before downloading, progress at the top right, then Restart to install. Android offers Download/Later in a bottom bar and an explicit Install action; Later waits until the next fresh launch. Android requires system installation confirmation.

The world atlas and calculations work offline, including charts back to 2000 BCE and Lahiri Transit search through 2026 CE. Public-person lookup needs internet. Saved Charts and History stay on the device.

Source is in the owner’s private `BC-works/jyotish` repository. This public repository holds release metadata and installer downloads, never private keys, tokens or personal charts. The stable feed is `updates/latest.json`; clients verify its RSA-SHA256 signature and downloaded file hashes. SHA256SUMS accompanies each release.

Windows 3.4.5 adds Main and Notes tabs to Research Lab. JyotishGPT can review and collect a public roster alongside requested data, including NBA regular-season career stats. An optional OpenAI key expands the range of natural-language requests the planner can interpret. The Windows release workflow upgrades an installed 3.4.4 app and checks that saved charts, History, and Research topics survive the upgrade. Android includes the local Research workspace, calculation worker, and reference data.

The Windows installer has no Authenticode publisher certificate, so Windows may show a publisher/trust warning. Update metadata and downloaded installers are independently authenticated by the app.
