# WRF-Data-Visualization
Web app for rapid WRF Data Visualization. Created by Rafał Damian for [CoCO2 project](https://coco2-project.eu/). Uses modified [Cameron Beccario code](https://github.com/cambecc/earth) under the MIT licence.

## Lauching server
-------

1. Install following:
    - Node.js
    - npm
    - MongoDB

2. clone this repository:
    
    git clone https://github.com/RafalDamian/WRF-Data-Visualization

3. inside app.js in DB Connection section connect to yours mongo db server

4. install node dependencies:
    
    npm install

5. launch server:

    node app.js

6. point your browser to:

    http://localhost:2115

## Uploading data to Viusalization
-------
1. install python 3.x
2. navigate to netcdf folder:

    cd netcdf_reader

3. create and activate environment:

    python -m venv env
    
    env\Scripts\activate

3. install requirements:

    pip3 install -r requirements.txt

4. inside netcdf_post.py set nc_files_dir as a path to directory with interpolated nc files

5. with running server, run netcdf_post.py:

    python3 netcdf_post.py



