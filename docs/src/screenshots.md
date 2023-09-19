# Generating Screenshots

Requirements:

- Access to the internal "screenshot"-repository
- Python 3
- A fresh identity in the correct build variant with an empty contact- and chat-list

Convert the screenshot data files:

    python tools/convert-screenshot-data.py ../path/to/screenshot/repository/

Choose the desired language in the app settings. Then press the "Generate
screenshot data" button in the debug panel (under "Storage").

Create screenshots of the resulting window (manually for now).
