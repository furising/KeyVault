# Code Signing Setup

## Windows

### Prerequisites
1. Purchase an EV or OV Code Signing Certificate from a CA (e.g., DigiCert, Sectigo, GlobalSign)
   - EV certs get immediate SmartScreen trust; OV certs build reputation over time
2. Export as `.pfx` with a strong password

### GitHub Secrets
| Secret | Description |
|--------|-------------|
| `WINDOWS_CERTIFICATE_BASE64` | Base64-encoded .pfx: `base64 -i cert.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the .pfx |

### How it works
The CI workflow imports the certificate into the Windows certificate store before building, then patches the thumbprint into `tauri.conf.json`. Tauri's bundler uses `signtool` to sign the MSI/NSIS installer and all executables.

---

## macOS

### Prerequisites
1. Join the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Create a **Developer ID Application** certificate in Xcode → Settings → Accounts → Manage Certificates
3. Export the certificate + private key as `.p12`:
   ```bash
   security find-identity -v -p codesigning  # find the identity hash
   security export -p <identity_hash> -o cert.p12 -P <password>
   ```
   Then base64-encode: `base64 -i cert.p12`
4. Create an App Store Connect API Key:
   - Go to [App Store Connect → Users & Access → Integrations → Keys](https://appstoreconnect.apple.com/access/integrations/api)
   - Create a key with **Developer** role
   - Download the `.p8` file (only once!)
   - Note the **Key ID** and **Issuer ID**

### GitHub Secrets
| Secret | Description |
|--------|-------------|
| `APPLE_SIGNING_IDENTITY` | Certificate Common Name (e.g. "Developer ID Application: Name (TEAMID)") |
| `APPLE_CERTIFICATE_BASE64` | Base64-encoded `.p12` file |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` |
| `APPLE_API_KEY_CONTENT` | Contents of the downloaded `.p8` private key file |
| `APPLE_API_KEY_ID` | The Key ID from App Store Connect |
| `APPLE_API_ISSUER` | The Issuer ID from App Store Connect |

### How it works
The CI workflow writes the `.p8` key to `~/.appstoreconnect/api-key.p8`, then `tauri-action` handles certificate import, signing, and notarization automatically.

---

## Adding Secrets
GitHub repo → Settings → Secrets and variables → Actions → New repository secret
