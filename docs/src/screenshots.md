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

- 1: Welcome screen
- 2: Chat with Hanna without sidebar
- 3: Chat with Foodies without sidebar
- 4: Chat with Foodies without sidebar with emoji picker
- 5: Chat with Foodies with sidebar
- 6: Chat with Foodies without sidebar, with contact list on the left
- 7: Settings: Profile
- 8: Settings: Appearance
- 9: Global search: Search for "to" (EN) or "er" (DE) while Foodies is open

Create screenshots with the following configurations:

- Light and dark mode
- EN and DE (Note: you need to re-import screenshot data after a language change)
