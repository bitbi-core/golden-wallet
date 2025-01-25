# Golden Wallet Installation Guide

## macOS Installation
(Supports Intel and Apple Silicon Macs)

### Step 1: Download the DMG File
1. Go to the [GitHub Releases page](https://github.com/bitbi-core/golden-wallet/releases)
2. Download the latest `.dmg` file (e.g., `Golden-Wallet-x.x.x.dmg`)

### Step 2: Mount the DMG and Install
1. Double-click the downloaded `.dmg` file to mount it
2. Drag the `Golden-Wallet.app` to the Applications folder

### Step 3: Bypass macOS Security for Unsigned Apps
> **Note:** Golden Wallet is an open-source project that hasn't been signed with Apple's developer certificate. While this means you'll see security warnings, the source code is publicly available for review on GitHub, ensuring transparency and security. The following steps are necessary to run the application, as macOS requires explicit permission for unsigned applications.

Option 1: Using Terminal
1. Open Terminal (use Spotlight: Cmd + Space, type "Terminal")
2. Run this command:
```bash
xattr -rd com.apple.quarantine /Applications/Golden-Wallet.app
```

Option 2: Manual Override

- Right-click the app → Open → Click Open in the warning dialog
### Step 4: Allow App Execution
1. Go to System Settings → Privacy & Security
2. Under "Security," look for a prompt to allow Golden Wallet
3. Click Allow
### Step 5: Launch the App
- Open Finder → Applications and double-click Golden-Wallet.app
## Windows Installation

### Step 1: Download the Windows Installer
1. Visit the GitHub Releases page
2. Download the Windows installer ( .exe or .msi )
### Step 2: Install the App
1. Double-click the downloaded installer
2. Follow the on-screen instructions to complete installation
### Step 3: Bypass Windows Defender/SmartScreen
> **Note:** As an open-source project, Golden Wallet hasn't been signed with a Microsoft certificate. While Windows Defender may show a warning, our source code is publicly available on GitHub for security verification. This warning appears for all new or unsigned applications as a security measure.

If blocked by Windows Defender:

1. Click "More Info" in the warning dialog
2. Select "Run Anyway"

## Linux Installation (Debian/Ubuntu)

### Step 1: Download the DEB Package
1. Visit the [GitHub Releases page](https://github.com/bitbi-core/golden-wallet/releases)
2. Download the latest `.deb` file (e.g., `golden-wallet_x.x.x_amd64.deb`)

### Step 2: Install the Package
Option 1: Using GUI
1. Navigate to the downloaded `.deb` file
2. Double-click the file to open with Software Center
3. Click "Install" and enter your password when prompted

Option 2: Using Terminal
1. Open Terminal
2. Navigate to the directory containing the downloaded file
3. Run the installation command:
```bash
sudo dpkg -i golden-wallet_*.deb
```
4. If there are dependency issues, resolve them by running:
```bash
sudo apt-get install -f
 ```

### Step 3: Launch the App
- Search for "Golden Wallet" in the Applications menu
- Or launch from terminal:

```bash
golden-wallet
 ```
 