# Slime.js development tools

## region-stats.mjs SAVE\_DIR [x(=0) [y(=-64) [z(=0)]]]
Show internal sector allocation of a region file at the speficied coordinates

## get-block.mjs SAVE\_DIR [x(=0) [y(=-64) [z(=0)]]]
Get block at the specified location

## display-section-palette.mjs SAVE\_DIR [x(=0) [y(=-64) [z(=0)]]]
Display section palette at the specified location

## extract-chunk.mjs SAVE\_DIR OUT\_FILE
Extract the chunk at 0,0 into a file containing raw binary NBT  
This is done without calling decodeNBT, thus this script can be used to test nbt.js

## extract-chunk-as-rnbt.mjs SAVE\_DIR OUT\_FILE [x(=0) [z(=0)]]
Extract the chunk at specifiled location into an rnbt file

## Usage examples
```bash
$node region-stats.mjs ~/.minecraft/saves/TEST_EVERY_BLOCKS/
$node get-block.mjs ~/.minecraft/saves/TEST_EVERY_BLOCKS/
$node display-section-palette.mjs ~/.minecraft/saves/TEST_EVERY_BLOCKS/
$node extract-chunk.mjs ~/.minecraft/saves/TEST_EVERY_BLOCKS/ ./chunk.nbt
$node extract-chunk-as-rnbt.mjs ~/.minecraft/saves/TEST_EVERY_BLOCKS/ ./chunk.rnbt
```

