[out:json][timeout:60];
(
  node["amenity"~"restaurant|cafe|fast_food"]["name"]["diet:vegetarian"](21.0180,105.7900,21.0905,105.8725);
  way["amenity"~"restaurant|cafe|fast_food"]["name"]["diet:vegetarian"](21.0180,105.7900,21.0905,105.8725);
  node["amenity"~"restaurant|cafe|fast_food"]["name"]["diet:vegan"](21.0180,105.7900,21.0905,105.8725);
  way["amenity"~"restaurant|cafe|fast_food"]["name"]["diet:vegan"](21.0180,105.7900,21.0905,105.8725);
  node["amenity"~"restaurant|cafe|fast_food"]["name"]["diet:halal"](21.0180,105.7900,21.0905,105.8725);
  way["amenity"~"restaurant|cafe|fast_food"]["name"]["diet:halal"](21.0180,105.7900,21.0905,105.8725);
);
out center tags;