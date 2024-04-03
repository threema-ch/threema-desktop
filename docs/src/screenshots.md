# Generating Screenshots

Requirements:

- Access to the internal "screenshot"-repository
- Python 3
- A fresh identity in the correct build variant with an empty contact- and chat-list

Convert the screenshot data files:

    python tools/convert-screenshot-data.py ../path/to/screenshot/repository/

Choose the desired language in the app settings. Then press the "Import screenshot data" button in
the debug panel (under "Storage").

Set the title using `document.title = 'Threema'` or `document.title = 'Threema Work'`.

Create screenshots of the resulting window (manually for now). It is recommended to include the
following screens:

- Welcome screen
- Chat with Hanna without sidebar
- Chat with Foodies without sidebar
- Chat with Foodies without sidebar with emoji picker
- Chat with Foodies with sidebar
- Chat with Foodies without sidebar, with contact list on the left
- Settings: Profile
- Settings: Appearance
- Global search: Search for "to" (EN) or "er" (DE) while Foodies is open

Create screenshots with the following configurations:

- Light and dark mode
- EN and DE (Note: you need to re-import screenshot data after a language change)
