import Moises from "./sdk.js";

const moises = new Moises({apiKey: "8f71aad7-2ca6-412f-bba2-8bdf0ee02920"});

await moises.processFile(
    "piano_separation",
    "web/temp/piano.mp3",
    "web/temp"
)