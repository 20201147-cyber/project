import { useEffect } from "react";

function MapContainer() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "//dapi.kakao.com/v2/maps/sdk.js?appkey=e976d6b999ba7e5b40468df4f16b5a55&autoload=false";
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById("map");
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 3,
        };
        new window.kakao.maps.Map(container, options);
      });
    };

    document.head.appendChild(script);
  }, []);

  return <div id="map" style={{ width: "400px", height: "400px" }}></div>;
}

export default MapContainer;
