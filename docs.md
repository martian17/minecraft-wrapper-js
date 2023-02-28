# World
location: index.mjs

## world.overworld : Dimension
## world.nether : Dimension
## world.end : Dimension

## world.save()
Saves the entire world

# Dimension
Represents a dimension  
Wraps around Region, Chunk, and Section (subchunk), and provides methods to directly interact with blocks

## async dimension.getRegion(x:Number,z:Number) : Region
Fetches a region instance. Creates it from the file if it does not exist in cache. x and z are in raw global coordinates (no modulo, no division)

## async dimension.getChunk(x:Number,z:Number) : Chunk
Wrapper around region.getChunk(). x and z are raw global coordinates. Fetches a chunk. Loads chunk or region if it does not exist in the cache.

## async dimension.getBlockData(x:Int,y:Int,z:Int) : BlockState
Wrapper around chunk.getBlockData(). Gets block state NBT as object at the specified coordinates. 

## async dimension.setBlockData(x:Int,y:Int,z:Int,data:BlockState) : undefined



