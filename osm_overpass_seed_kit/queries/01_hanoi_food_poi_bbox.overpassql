[out:json][timeout:60];
(
  /* Hoàn Kiếm bbox */
  node["amenity"~"restaurant|cafe|fast_food"]["name"](21.0180,105.8400,21.0415,105.8725);
  way["amenity"~"restaurant|cafe|fast_food"]["name"](21.0180,105.8400,21.0415,105.8725);
  relation["amenity"~"restaurant|cafe|fast_food"]["name"](21.0180,105.8400,21.0415,105.8725);

  /* Ba Đình bbox */
  node["amenity"~"restaurant|cafe|fast_food"]["name"](21.0270,105.8030,21.0535,105.8420);
  way["amenity"~"restaurant|cafe|fast_food"]["name"](21.0270,105.8030,21.0535,105.8420);
  relation["amenity"~"restaurant|cafe|fast_food"]["name"](21.0270,105.8030,21.0535,105.8420);

  /* Tây Hồ bbox */
  node["amenity"~"restaurant|cafe|fast_food"]["name"](21.0500,105.7900,21.0905,105.8425);
  way["amenity"~"restaurant|cafe|fast_food"]["name"](21.0500,105.7900,21.0905,105.8425);
  relation["amenity"~"restaurant|cafe|fast_food"]["name"](21.0500,105.7900,21.0905,105.8425);
);
out center tags;