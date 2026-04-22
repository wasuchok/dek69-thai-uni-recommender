Place your Thailand GeoJSON file here as:

`/data/thailand.geojson`

This project already expects that exact path in `main.js`.

Recommendation data file:

`/data/recommender_dataset.json`

This file is generated from real MHESI datasets in `/data/raw` using:

`venv/bin/python scripts/build_recommender_dataset.py`

Required raw input files:

- `univ_std_11_01_2568*.csv` (one or more 2568 student files, e.g. term 1/2)
- `dqe_11_03.csv`
