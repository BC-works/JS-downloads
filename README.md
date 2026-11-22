# Jyotish Studio downloads

Windows and Android installers are available from **[Releases](https://github.com/BC-works/JS-downloads/releases)**.

- **Windows 10/11 x64** can use the [3.6.0 installer](https://github.com/BC-works/JS-downloads/releases/download/v3.6.0/Jyotish-Studio-Setup-3.6.0.exe). It runs with a standard user account and retains the existing Jyotish Studio Offline profile.
- **Android 8.0+** can use the [3.4.2 APK](https://github.com/BC-works/JS-downloads/releases/download/v3.4.2/Jyotish-Studio-Next-Android.apk). Install it over Jyotish Studio Next to keep the app’s existing data. Use an up-to-date Android System WebView.

Versions without an updater need one manual install to enable future in-app updates. Windows shows release notes before downloading, progress at the top right, then Restart to install. Android offers Download/Later in a bottom bar and an explicit Install action; Later waits until the next fresh launch. Android requires system installation confirmation.

The world atlas and calculations work offline, including charts back to 2000 BCE and Lahiri Transit search through 2026 CE. Public-person lookup needs internet. Saved Charts and History stay on the device.

Source is in the owner’s private `BC-works/jyotish` repository. This public repository holds release metadata and installer downloads, never private keys, tokens or personal charts. The stable feed is `updates/latest.json`; clients verify its RSA-SHA256 signature and downloaded file hashes. SHA256SUMS accompanies each release.

Windows 3.6 includes the Research library and Research Lab. Select a saved topic to see its charts, birth-time coverage, notes, and analyses. Continue research to work with its roster, charts, and questions, or open JyotishGPT to start a topic. Review a sourced example before collecting a group, then check the coverage report before keeping it as a topic. Supported Wikidata groups work without a key. For other published registers, you can choose an OpenAI model and enter your own API key in JyotishGPT settings. Windows encrypts the key for your account. The model picker loads the OpenAI model IDs available to that key and lets you refresh the list or enter an exact ID. Describe a group and its requested fields in one prompt. Follow-up questions appear in the conversation above the reply field. Model calls and web search can incur provider charges.

The Windows installer has no Authenticode publisher certificate, so Windows may show a publisher/trust warning. Update metadata and downloaded installers are independently authenticated by the app.
