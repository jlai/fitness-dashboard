# Additional services

## Maps

For maps, we use [Protomaps](https://protomaps.com/) because:

- It can be used with third-party Javascript libraries like MapLibre GL,
  which can be bundled locally unlike many map services which require you
  to add an external script tag.
- It can be cheaply self-hosted, allowing for additional control over who
  can see/log what tiles are loaded.
- Since it uses OpenStreetMap data, there are no restrictions on local
  tile caching.
- It can be run offline (~120GB but you can extract smaller regions)

### Configuring

1. Get an API key from https://protomaps.com/dashboard
2. Add `NEXT_PUBLIC_MAPLIBRE_STYLE_URL=https://api.protomaps.com/styles/v2/white.json?key=KEYGOESHERE`
   to your `.env.local`
