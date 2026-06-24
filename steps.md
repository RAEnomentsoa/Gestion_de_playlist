






program 2: 

Then run:

python mp3_metadata.py              # watch New_music/, every 5s
python mp3_metadata.py -m 1        # every 1 minute
python mp3_metadata.py -i 30       # every 30 seconds
What it extracts per MP3:

Champ	Source
Durée, Bitrate, Sample rate	Audio stream info
Titre, Artiste, Album	ID3 tags
Date de sortie	date tag
Genre, BPM, ISRC	ID3 tags
Compositeur, Parolier	ID3 tags
Piste, Disque	Track/disc number
Commentaire, Copyright, Encodé par	ID3 tags
At startup it lists all existing MP3s with their metadata, then watches for new arrivals just like program 1.


program 3:

Run it:
python programe3.py                          # default folder + localhost API
python programe3.py --api http://myserver/api/track
python programe3.py -m 1 --api http://myserver/api/track
What it sends — a GET request like:


GET http://localhost:8000/api/track
    ?absolute_path=C:\...\New_music\INDUSTRY BABY.mp3
    &Durée=3:32
    &Bitrate=320 kbps
    &Mode=Stereo
    &Titre=...
    &Artiste=...
    &Genre=...
    ...
While the API is offline it prints [OFFLINE] and keeps watching — it won't crash. When the API is ready, just point --api at it and it'll start sending.