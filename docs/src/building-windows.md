# Building on Windows

To build and run the project manually on Windows (e.g., for manual testing) a few steps are
necessary.

> ⚠️ _Note: Manual builds will be unsigned and thus need to be installed in a different way, which
> is explained below._

In order to be able to make builds, the following prerequisites need to be set up beforehand:

- The required versions of Node and NPM need to be installed on the machine (consult the
  `package.json` to get the currently used versions).
- `makeappx.exe` and `makepri.exe` binaries need to be present on the machine (usually installed
  when installing Visual Studio). The binaries can usually be found at the following location:
  `C:\Program Files (x86)\Windows Kits\<major-version-number>\bin\<minor-version-number>\x64\<makeappx.exe | makepri.exe>`.
- The full project files, including submodules, need to be present on the machine. Make sure to
  install `node_modules` on the machine itself, instead of copying them over from another host.

Before building, export the following variables:

```powershell
$Env:WIN_MAKEAPPX_EXE_PATH = "C:\Program Files (x86)\<path-to-makeappx.exe>"
$Env:WIN_MAKEPRI_EXE_PATH = "C:\Program Files (x86)\<path-to-makepri.exe>"
$Env:WIN_SIGN_CERT_SUBJECT = "CN=Threema, O=Threema, L=Pfaeffikon, S=Schwyz, C=Switzerland, OID.2.25.311729368913984317654407730594956997722=1"
```

Keep in mind that the OID shown above is a reserved value, which will result in an unsigned package.
For more details, see: <https://learn.microsoft.com/en-us/windows/msix/package/unsigned-package>.

Build the MSIX package by running
`npm run package msix <consumer-live | consumer-sandbox | work-live | work-sandbox>` from the
project root. When the build process is complete, the application can be installed by executing the
following command (also from the project root):
`Add-AppPackage -Path ".\build\out\<name-of-msix>.msix" -AllowUnsigned`.
