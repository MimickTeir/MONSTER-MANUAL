// afterPack: stamp build/icon.ico onto the packed exe with resedit
// (signAndEditExecutable is false, so electron-builder leaves the exe alone —
// this avoids the wine-based rcedit path breaking the build).
const fs = require('fs');
const path = require('path');

exports.default = async function setIcon(context) {
  if (context.electronPlatformName !== 'win32') return;
  const exe = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.exe');
  const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');
  if (!fs.existsSync(exe) || !fs.existsSync(icoPath)) {
    console.log('[setIcon] skip — missing', fs.existsSync(exe) ? icoPath : exe);
    return;
  }
  // resedit v2/v3 splits the PE reader into pe-library; support both layouts.
  let ResEdit, NtExecutable, NtExecutableResource;
  ResEdit = require('resedit');
  if (ResEdit.NtExecutable) {
    ({ NtExecutable, NtExecutableResource } = ResEdit);
  } else {
    ({ NtExecutable, NtExecutableResource } = require('pe-library'));
  }
  const data = fs.readFileSync(exe);
  const pe = NtExecutable.from(data, { ignoreCert: true });
  const res = NtExecutableResource.from(pe);
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    ResEdit.Resource.IconGroupEntry.fromEntries(res.entries).map((e) => e.id)[0] || 1,
    1033,
    ico.icons.map((i) => i.data)
  );
  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));
  console.log('[setIcon] icon stamped on', exe);
};
