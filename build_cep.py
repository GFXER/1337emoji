"""Builds + installs the 1337emoji 2.0 CEP panel (Premiere Pro + After Effects).
Uses the pool already made by build_1337emoji.py (dist/1337emoji/1337emoji_pool + manifest.json).
python3 build_cep.py [--install]"""
import json, os, shutil, sys, re

HERE = os.path.dirname(os.path.abspath(__file__))
CEP = os.path.join(HERE, 'cep')
OUT = os.path.join(HERE, 'dist', 'com.cheats1337.emoji')
POOL = os.path.join(HERE, 'dist', '1337emoji', '1337emoji_pool')
VERSION = '2.0.0'

# names/cats from the panel jsx literal (single source of truth = build_1337emoji.py output)
jsx = open(os.path.join(HERE, 'dist', '1337emoji', '1337emoji.jsx')).read()
names = json.loads(re.search(r'var NAMES = (\[.*?\]);\n', jsx, re.S).group(1))
man = json.load(open(os.path.join(HERE, 'dist', '1337emoji', 'manifest.json')))

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, 'CSXS'))
for f in ['index.html', 'main.js', 'style.css', 'host.jsx']:
    shutil.copyfile(os.path.join(CEP, f), os.path.join(OUT, f))
shutil.copyfile(os.path.expanduser('~/Library/Application Support/Adobe/CEP/extensions/MCPBridgeCEP/CSInterface.js'), os.path.join(OUT, 'CSInterface.js'))
shutil.copytree(POOL, os.path.join(OUT, 'pool'))
open(os.path.join(OUT, 'data.js'), 'w').write('window.EMOJI_DATA = ' + json.dumps(
    {'names': names, 'cats': man['categories'], 'ranges': man['ranges']}, ensure_ascii=True) + ';\n')

MANIFEST = '''<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest Version="7.0" ExtensionBundleId="com.cheats1337.emoji" ExtensionBundleVersion="{v}" ExtensionBundleName="1337emoji">
  <ExtensionList><Extension Id="com.cheats1337.emoji.panel" Version="{v}"/></ExtensionList>
  <ExecutionEnvironment>
    <HostList><Host Name="PPRO" Version="14.0"/><Host Name="AEFT" Version="17.0"/></HostList>
    <LocaleList><Locale Code="All"/></LocaleList>
    <RequiredRuntimeList><RequiredRuntime Name="CSXS" Version="9.0"/></RequiredRuntimeList>
  </ExecutionEnvironment>
  <DispatchInfoList>
    <Extension Id="com.cheats1337.emoji.panel">
      <DispatchInfo>
        <Resources>
          <MainPath>./index.html</MainPath>
          <ScriptPath>./host.jsx</ScriptPath>
          <CEFCommandLine>
            <Parameter>--allow-file-access-from-files</Parameter>
            <Parameter>--enable-nodejs</Parameter>
            <Parameter>--mixed-context</Parameter>
          </CEFCommandLine>
        </Resources>
        <Lifecycle><AutoVisible>true</AutoVisible></Lifecycle>
        <UI>
          <Type>Panel</Type>
          <Menu>1337emoji</Menu>
          <Geometry><Size><Height>900</Height><Width>390</Width></Size><MinSize><Height>500</Height><Width>320</Width></MinSize></Geometry>
        </UI>
      </DispatchInfo>
    </Extension>
  </DispatchInfoList>
</ExtensionManifest>
'''.format(v=VERSION)
open(os.path.join(OUT, 'CSXS', 'manifest.xml'), 'w').write(MANIFEST)
print('built', OUT)

if '--install' in sys.argv:
    dst = os.path.expanduser('~/Library/Application Support/Adobe/CEP/extensions/com.cheats1337.emoji')
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    shutil.copytree(OUT, dst)
    print('installed', dst)
