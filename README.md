# Jyotish Studio downloads

Windows and Android installers are available from **[Releases](https://github.com/BC-works/JS-downloads/releases)**.

- **Windows 10/11 x64:** download `Jyotish-Studio-Setup-3.4.0.exe` and run it. No admin rights are needed. The app retains the existing Jyotish Studio Offline profile.
- **Android 8.0+:** download `Jyotish-Studio-Next-Android.apk` and install it over Jyotish Studio Next without uninstalling. Use an up-to-date Android System WebView.

Versions without an updater need one manual install to enable future in-app updates. Windows shows release notes before downloading, progress at the top right, then Restart to install. Android offers Download/Later in a bottom bar and an explicit Install action; Later waits until the next fresh launch. Android requires system installation confirmation.

The world atlas and calculations work offline, including charts back to 2000 BCE and Lahiri Transit search through 2026 CE. Public-person lookup needs internet. Saved Charts and History stay on the device.

Source is in the owner’s private `BC-works/jyotish` repository. This public repository holds release metadata and installer downloads, never private keys, tokens or personal charts. The stable feed is `updates/latest.json`; clients verify its RSA-SHA256 signature and downloaded file hashes. SHA256SUMS accompanies each release.

Windows and Android 3.3 include the local Research workspace: chart topics, reviewed questions, interactive findings, comparisons and frozen pinned evidence. Charts and Research have their own commands and topic/chart tabs, with the last workspace remembered. Android uses a compact phone layout and includes the calculation worker and reference data. The release workflow upgrades Windows 3.2.0 and checks retained Saved/History plus Research topics, notes and pinned evidence across restart. Android package signatures, bundled assets and browser bridge flows are checked; its OS installation and actual WebView behavior still need a physical-device check.

The Windows installer has no Authenticode publisher certificate, so Windows may show a publisher/trust warning. Update metadata and downloaded installers are independently authenticated by the app.
