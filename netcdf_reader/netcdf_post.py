import netCDF4 as nc
import numpy as np
import json
from os import listdir
from os.path import isfile, join
import requests
import sys

class NetCDFpost:

    def __init__(self, netcdf_file_path, variables):
        self.file = netcdf_file_path
        self.input_data = nc.Dataset(netcdf_file_path)
        self.vars = variables #dict: {var_name: {'vars':[vars], 'offset':n},...}
        #does not include: lon, lat, time, u, v - these are obligatory

    def process(self, url):
        times = len(self.input_data['time'])
        levels = 10 #arbitrary (because of memory)
        for time in range(times):
            for level in range(levels):
                post_data = {}
                #levels:
                post_data['time'] = time
                post_data['ntimes'] = times
                post_data['level'] = level
                post_data['nlevels'] = levels
                post_data['units'] = self._read_units()
                #wind:
                u = self._read_var_as_array(['U'], time)
                v = self._read_var_as_array(['V'], time)
                nx = u.shape[1] #assumpion: every var has the same shape
                ny = u.shape[2]
                post_data['wind'] = {'u':[], 'v':[]}
                print('Processing U...', file=sys.stdout)
                post_data['wind']['u']= (self._reshape_data(nx, ny, u, level))
                print('Processing V...', file=sys.stdout)
                post_data['wind']['v']= (self._reshape_data(nx, ny, v, level))
                #date
                post_data['date'] = self._get_date()
                #header
                post_data['header'] = self._build_header(nx, ny)
                #title
                post_data['title'] = self.file.split('\\')[1]
                #other variables:
                post_data['vars'] = list(self.vars.keys())
                for var in self.vars:
                    print(f'Processing {var}...', file=sys.stdout)
                    var_arr = self._read_var_as_array(self.vars[var]['vars'], time,
                                                        self.vars[var]['offset'])
                    post_data[var]=(self._reshape_data(nx, ny, var_arr, level))
                self._post_req(url, post_data, time, level)
                
    def _read_units(self):
        units = {}
        units['wind'] = self.input_data['U'].unit
        for var in self.vars:
            units[var] = self.input_data[self.vars[var]['vars'][0]].unit
        return units
    def _read_var_as_array(self, vars, time_index, offset=0):
        data = 0
        if self.input_data[vars[0]].ndim == 3:
            for var in vars: data += self.input_data[var][time_index,:,:]
        elif self.input_data[vars[0]].ndim == 4:
            for var in vars: data += self.input_data[var][time_index,:,:,:]
        else:
            raise Exception('Unsupported number of dimentions')
        if offset: data[data>offset] -= offset
        return np.squeeze(np.around(data.__array__()))

    def _reshape_data(self, nx, ny, data, level=0):
        data_reversed = []
        if data.ndim == 2: 
            for x in range(nx-1, -1, -1):
                for y in range(ny):
                    data_reversed.append(float(data[x,y]))
        else: 
            for x in range(nx-1, -1, -1):
                for y in range(ny):
                    data_reversed.append(float(data[level, x,y]))
        return data_reversed

    def _get_date(self):
        centerName = self.file.split('\\')[1]
        split_name = centerName.split('_')
        for text in split_name:
            if text.startswith('20') and len(text) == 8:
                date = text[:4] + '-' + text[4:6] + '-' + text[6:]
                break
        return date

    def _build_header(self, nx, ny):
        print('Creating header...', file=sys.stdout)
        centerName = self.file.split('\\')[1]
        header = {'header': {}, "meta": {"date": self._get_date()}}
        header['header']['nx'] = nx
        header['header']['ny'] =  ny
        header['header']['lo1'] = float(self.input_data['longitude'][0])
        header['header']['la1'] = float(self.input_data['latitude'][-1])
        header['header']['dx'] = float(np.absolute(self.input_data['latitude'][0]-
            self.input_data['latitude'][1]))
        header['header']['dy'] = 0.5 * (float(np.absolute(self.input_data['longitude'][0]-
            self.input_data['longitude'][1])))
        header['header']['refTime'] = 0
        header['header']['forecastTime'] = 0
        header['header']['centerName'] = centerName
        return header

    def _post_req(self, url, post_data, time, level):
        print(f'Posting time: {time}, level:{level}...')
        r = requests.post(url, 
                  data = json.dumps(post_data),
                  headers={'Content-Type': 'application/json'},)
        print(r, file=sys.stdout)


if __name__ == '__main__':

    nc_files_dir = 'nc_files'
    files = [join(nc_files_dir + '\\', f) for f in listdir(nc_files_dir + '\\') 
            if f.endswith(".nc")]
    variables = {
            'CO2': {
                'vars': ['CO2_PP_H', 'CO2_PP_M', 'CO2_PP_L', 'CO2_PP_T', 
                        'CO2_BG', 'CO2_ANTH', 'CO2_BIO'],
                'offset': 400
            },
            'ZSURF': {'vars': ['ZSURF',], 'offset': 0},
            'Q': {'vars': ['Q',], 'offset': 0},
            'T': {'vars': ['T',], 'offset': 0},
            'PS': {'vars': ['PS',], 'offset': 0},
            'Z': {'vars': ['Z',], 'offset': 0},
        }
    for file in files:
        post_class = NetCDFpost(file, variables)
        post_class.process('http://localhost:2115/upload')
