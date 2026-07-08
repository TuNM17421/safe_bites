[out:json][timeout:60];
(
  node["amenity"~"restaurant|cafe|fast_food"]["name"]["website:menu"](21.0180,105.7900,21.0905,105.8725);
  way["amenity"~"restaurant|cafe|fast_food"]["name"]["website:menu"](21.0180,105.7900,21.0905,105.8725);
  relation["amenity"~"restaurant|cafe|fast_food"]["name"]["website:menu"](21.0180,105.7900,21.0905,105.8725);
);
out center tags;