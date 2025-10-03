# Oakality - Pmtiles Server for World Localities

Oakality is an HTTP server built with Deno and Oak that serves pmtiles (vector
tiles) for localities (cities, towns, villages) from around the world. It
extracts and serves pmtiles files based on geographic boundaries from the
WhosOnFirst admin database.

## Prerequisites

Before running Oakality, ensure you have the following command-line tools
installed:

- `pmtiles` - For extracting pmtiles files
  ([Install instructions here](https://docs.protomaps.com/guide/getting-started))
- `bzip2` - For decompressing the database
- `find` - For efficient file operations

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nipsysdev/oakality.git
   cd oakality
   ```

2. Install Deno if you haven't already:\
   https://docs.deno.com/runtime/getting_started/installation/

3. Install dependencies
   ```bash
   deno install
   ```

## Usage

### Starting the Server

Run the following command to start the server:

```bash
deno task start
```

The server will start on port 8080 (or as configured in `src/constants.ts`).

### First Run

On the first run, the application will:

1. Download the WhosOnFirst admin database (compressed bzip2)
2. Decompress the database to SQLite format
3. Check for existing pmtiles files
4. Prompt you to extract missing pmtiles files if needed

> Be aware that, by default, all localities from every country available will be
> queued for extraction.\
> Downloading everything will take a significant amount of hours (days
> potentially!)
>
> You can restrict the download of pmtiles to specific countries by setting
> TARGET_COUNTRIES to an array of country codes in `src/constants.ts`.

## API Endpoints

### Countries

- **GET** `/countries`
  - Returns a list of all countries with their codes and locality counts
  - Response format:
    ```json
    {
      "success": true,
      "data": [
        {
          "countryCode": "BE",
          "countryName": "Belgium",
          "localityCount": 2136
        }
      ]
    }
    ```

### Localities

- **GET** `/countries/:countryCode/localities`
  - Returns a paginated list of 20 localities for a specific country
  - Query parameters:
    - `q` (optional): Text to search in locality names
    - `page` (optional): Page number (default: 1)
  - Response format:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 101839773,
          "name": "Brugelette",
          "country": "BE",
          "placetype": "locality",
          "latitude": 50.576433,
          "longitude": 3.851975,
          "fileSize": 2928590
        },
        {
          "id": 101748097,
          "name": "Brugge",
          "country": "BE",
          "placetype": "locality",
          "latitude": 51.208664,
          "longitude": 3.217718,
          "fileSize": 6773970
        }
      ],
      "pagination": {
        "total": 6,
        "page": 1,
        "limit": 20,
        "totalPages": 1
      }
    }
    ```

### Pmtiles Files

- **GET** `/countries/:countryCode/localities/:id/pmtiles`
  - Serves the pmtiles file for a specific locality
  - Sets appropriate headers for file download
  - Returns 404 if the file doesn't exist

## Configuration

Configuration constants are defined in `src/constants.ts`:

- `PORT`: Server port number (8080)
- `ASSETS_DIR`: Directory for storing assets (assets)
- `PMTILES_CMD`: Command-line tool for pmtiles operations (pmtiles)
- `BZIP2_CMD`: Command-line tool for decompression (bzip2)
- `FIND_CMD`: Command-line tool for file operations (find)
- `WHOSONFIRST_DB_URL`: URL for the WhosOnFirst database
- `PROTOMAPS_BUILDS_URL`: URL for Protomaps builds JSON list
- `TARGET_COUNTRIES`: List of country codes to process (empty array = ALL)

## License

This project is licensed under the GNU GPLv3 License.
