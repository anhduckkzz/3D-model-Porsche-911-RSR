# Rendering fix note

The Peugeot Studio export contains custom meshes whose Three/LDraw material groups do not always cover every generated vertex. The importer previously left uncovered vertex colors at the Float32Array default (black), which showed up as triangular black/white artifacts after geometry merging.

The importer now seeds every vertex with the mesh base color before applying authored material groups. Regenerate 42156 after pulling this change so `public/models/42156/geometry.bin.gz` is rebuilt with corrected colors.

The lightweight WebGL viewer also receives a small display-only saturation/contrast correction to compensate for the bright neutral environment while preserving the authored LDraw vertex colors.
