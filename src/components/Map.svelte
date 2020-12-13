<script lang="ts">
	import { onMount } from 'svelte'
	import L, { LatLngExpression } from 'leaflet'
  import 'leaflet/dist/leaflet.css'



  let mapContainer
  let map

  const rgb = (r: number, g: number, b: number) => {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }

  const loadPostCode = (postCode: string) => {
    fetch(`/data/postcode/${postCode}.json`)
      .then(res => res.json())
      .then(data => {
        L.geoJSON(data, {
        style: function(feature) {
          return {
            color: rgb(Math.random()*256, Math.random()*256, Math.random()*256)
          }
        }
      }).addTo(map)
    })
  }

	onMount(() => {
    const initialView: LatLngExpression = [53.4808, -2.2426]
    map = L.map(mapContainer, {
      preferCanvas: true,
      zoomControl: false,
      }).setView(initialView, 12)

		const leaflet = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
			attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
			id: 'mapbox/light-v10',
			tileSize: 512,
			zoomOffset: -1,
      accessToken: 'redacted',
    }).addTo(map)	
    
    map.invalidateSize()
    for (const postcode of [
      "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M11", "M12", "M13", "M14", "M15", "M16", "M17", 
      "M19", "M20", "M21", "M22", "M23", "M24", "M25", "M26", "M27", "M28", "M29", "M30", "M31", "M32", "M33", 
      "M34", "M35", "M38", "M40", "M41", "M43", "M44", "M45", "M46", "M50", "M90", 
    ]) {
      loadPostCode(postcode)
    }
	});

</script>

<main>
	<div id="map" bind:this="{mapContainer}"/>
</main>
<style>
	#map {
    position: fixed;
    display: block;
    margin: 0;
    padding: 0;
    top: 0px;
    bottom: 0px;
    width: 100%;
    height: 100%;
	}
</style>