# TerraView
# TerraView – Discover Places. Explore Possibilities.

TerraView is a simple, interactive, and responsive mapping website inspired by OpenStreetMap. It helps users search for locations, explore places on an interactive map, and access map controls through a clean, beginner-friendly interface.

## Features

- **Location Search:** Search for places and addresses using the Nominatim API.
- **Interactive Map:** View locations and explore geographical areas using Leaflet.js and OpenStreetMap.
- **Location Markers:** Select map markers to view available location details.
- **Map Layers:** Switch between available map styles.
- **Nearby Places:** Explore nearby points of interest, if implemented.
- **Form Validation:** Prevent empty searches and display helpful validation messages.
- **User Feedback:** Show loading indicators, success messages, and error notifications.
- **Responsive Design:** Works on desktop, tablet, and mobile screens.
- **Error Handling:** Handles network failures, empty results, and unsuccessful API requests.

## Technologies Used

- HTML5
- Tailwind CSS
- JavaScript
- Fetch API
- JSON
- Leaflet.js
- OpenStreetMap
- Nominatim Geocoding API
- Overpass API (optional, for nearby places)

## Project Structure

```text
TerraView/
├── index.html
├── script.js
└── README.md
```

## Getting Started

1. Clone or download this repository.
2. Open the project folder in your code editor.
3. Open `index.html` using a local development server, such as the VS Code Live Server extension.
4. Open the website in your browser.
5. Enter a location in the search bar and explore the map.

An active internet connection is required to load map tiles and retrieve geographical data.

## APIs Used

### Nominatim Search API

Used to search for places and retrieve geographical coordinates.

Example endpoint:

```text
https://nominatim.openstreetmap.org/search?format=jsonv2&q=Bengaluru
```

### OpenStreetMap

Provides map tiles for displaying geographical information.

Website: https://www.openstreetmap.org/

### Overpass API (Optional)

Used to retrieve nearby points of interest, such as restaurants, parks, and other facilities, if this feature is implemented.

Website: https://overpass-api.de/

## JavaScript Events

TerraView uses JavaScript events to provide interactive functionality:

1. **Search form submission:** Validates input, fetches location data, and displays search results.
2. **Map or marker click:** Displays information about a selected location.
3. **Map layer button click:** Changes the displayed map style.
4. **Nearby Places button click:** Retrieves and displays nearby points of interest, if implemented.

## Validation and Error Handling

The website provides feedback for common situations:

- Empty search input.
- No matching locations.
- Network or API errors.
- Unexpected API responses.
- Loading and successful search states.

These features help users understand what is happening and recover from errors.

## Project Objective

The main objective of TerraView is to improve the mapping experience for first-time and mobile users by simplifying location search, grouping common actions, and providing clear feedback.

Compared with a general-purpose mapping interface, TerraView prioritises usability, accessibility, and straightforward interactions.

## Future Improvements

- Add route planning between two locations.
- Improve nearby place discovery.
- Add filters for restaurants, parks, hospitals, and other facilities.
- Improve accessibility and keyboard navigation.
- Add more map styles and custom markers.

## Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org/) for map data and tiles.
- [Leaflet.js](https://leafletjs.com/) for interactive mapping.
- [Nominatim](https://nominatim.org/) for geocoding and place search.
- [Tailwind CSS](https://tailwindcss.com/) for styling.

---

**TerraView – Discover places. Explore possibilities.**
