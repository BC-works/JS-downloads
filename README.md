# Jyotish Studio downloads

Windows and Android installers are available from **[Releases](https://github.com/BC-works/JS-downloads/releases)**.

- **Windows 10/11 x64** can use the [3.4.6 installer](https://github.com/BC-works/JS-downloads/releases/download/v3.4.6/Jyotish-Studio-Setup-3.4.6.exe). It runs with a standard user account and retains the existing Jyotish Studio Offline profile.
- **Android 8.0+** can use the [3.4.2 APK](https://github.com/BC-works/JS-downloads/releases/download/v3.4.2/Jyotish-Studio-Next-Android.apk). Install it over Jyotish Studio Next to keep the app’s existing data. Use an up-to-date Android System WebView.

Versions without an updater need one manual install to enable future in-app updates. Windows shows release notes before downloading, progress at the top right, then Restart to install. Android offers Download/Later in a bottom bar and an explicit Install action; Later waits until the next fresh launch. Android requires system installation confirmation.

The world atlas and calculations work offline, including charts back to 2000 BCE and Lahiri Transit search through 2026 CE. Public-person lookup needs internet. Saved Charts and History stay on the device.

Source is in the owner’s private `BC-works/jyotish` repository. This public repository holds release metadata and installer downloads, never private keys, tokens or personal charts. The stable feed is `updates/latest.json`; clients verify its RSA-SHA256 signature and downloaded file hashes. SHA256SUMS accompanies each release.

Windows 3.4.6 adds Research topic archiving, restoration and confirmed permanent deletion. JyotishGPT collects supported public groups and biographical facts through Wikidata. Existing topics, attached datasets and copied charts remain in your profile. The Windows release checks upgrade an installed 3.4.5 copy and exercise the topic controls in the installed app.

The Windows installer has no Authenticode publisher certificate, so Windows may show a publisher/trust warning. Update metadata and downloaded installers are independently authenticated by the app.
