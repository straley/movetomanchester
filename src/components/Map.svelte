<script lang="ts">
	import { onMount } from 'svelte'
	import L, { LatLngExpression } from 'leaflet'
  import 'leaflet/dist/leaflet.css'

  let mapContainer
  let map

  const crimeGradient = [
    "#44cc44",
    "#4fc144",
    "#5bb544",
    "#66aa44",
    "#719f44",
    "#7d9344",
    "#888844",
    "#937444",
    "#9f7144",
    "#aa6644",
    "#b55b44",
    "#c14f44",
    "#cc4444",
  ]

  const attachMap = (geoJSON:any, crimeScore: any) => {
    L.geoJSON(geoJSON, {
        style: function(feature) {
          const score = crimeScore[feature.properties.PostDist]
          const worst = 10
          if (score > worst) {
            return {color: crimeGradient[12]}
          } else if (score > worst * 0.5) {
            return {color: crimeGradient[11]}
          } else if (score > worst * 0.25) {
            return {color: crimeGradient[10]}
          } else if (score > worst * 0.125) {
            return {color: crimeGradient[9]}
          } else if (score > worst * 0.0675) {
            return {color: crimeGradient[8]}
          } else if (score > worst * 0.03125) {
            return {color: crimeGradient[7]}
          } else if (score > worst * 0.015625) {
            return {color: crimeGradient[6]}
          } else if (score > worst * 0.0078125) {
            return {color: crimeGradient[5]}
          } else if (score > worst * 0.00390625) {
            return {color: crimeGradient[4]}
          } else if (score > worst * 0.001953125) {
            return {color: crimeGradient[3]}
          } else if (score > worst * 0.0009765625) {
            return {color: crimeGradient[2]}
          } else if (score > worst * 0.00048828125) {
            return {color: crimeGradient[1]}
          } else if (typeof(score) === 'undefined') {
            return {color: "#000000"}
          }
          return {color: crimeGradient[0]}
        }
      }).addTo(map)
  }

  const loadCensusData = (areas:string[]): Promise<any> => {
    let allData = {}
    return new Promise(async(resolve, reject) => {
      for (const area of areas) {
        try {
          const res = await fetch(`/data/census/census-${area}.json`)
          const censusJSON = await res.json()
          allData = {...allData, ...censusJSON}
        } catch (e) {
          reject(e)
        }
      }
      resolve(allData)
    })    
  }

  const loadCrimeData = (months: string[]):Promise<any> => {
    return new Promise((resolve, reject) => {
      const crimeData = {}

      for (const month of months) {
        fetch(`/data/crime/${month}.json`)
          .then(res => res.json())
          .then(crimeJSON => {
            crimeData[month] = crimeJSON
            if (Object.keys(crimeData).length === months.length) {
              resolve(crimeData)
            }
          })
          .catch(e => reject(e))
      }

    })
  }

  const loadPostCode = (postCode: string):Promise<any> => {
    return new Promise((resolve, reject) => {
      fetch(`/data/postcode/${postCode}.json`)
      .then(res => res.json())
      .then(geoJSON => {
        resolve(geoJSON)
      })
      .catch(e => reject(e))
    })
  }

	onMount(async () => {
    const initialView: LatLngExpression = [53.4808, -2.285]
    map = L.map(mapContainer, {
      preferCanvas: true,
      zoomControl: false,
      }).setView(initialView, 12)

		const leaflet = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
			attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
			id: 'mapbox/dark-v10',
			tileSize: 512,
			zoomOffset: -1,
      accessToken: 'pk.eyJ1Ijoic2NvdHRzdHJhbGV5IiwiYSI6ImNpcGFwcW9sZjAwNDFzbm5qeW5vdmN0eXUifQ.gNk49fYjd3Mfx2b30uCKXg',
    }).addTo(map)	
    
    map.invalidateSize()

    const months = [
      '2020-10', '2020-09', '2020-08', '2020-07', '2020-06', '2020-05', '2020-04', '2020-03', '2020-02', '2020-01', 
      '2019-12', '2019-11', '2019-10', '2019-09', '2019-08', '2019-07', '2019-06'
    ]
    // const months = [
    //   '2019-06'
    // ]

    // make previous months less of a factor
    const monthWeights = months.reduce((previous, current, index) => {
      previous[current] = (months.length - index)  / months.length
      return previous
    }, {}) 

    const totalWeights = Object.keys(monthWeights).reduce((previous, current) => previous + monthWeights[current], 0)

    console.log(monthWeights, totalWeights)

    const censusData = await loadCensusData(["M", "WA", "SK", "OL", "BL", "WN"])
    const crimeData = (await loadCrimeData(months))

    const crimeCategoryWeights = {
      behavior: 0.5,
      property: 0.75,
      violent: 1,
    }

    const crimeWeight = {
      "anti-social-behaviour": 35 * crimeCategoryWeights.behavior, 
      "other-crime": 25 * crimeCategoryWeights.behavior, 
      "public-order": 35 * crimeCategoryWeights.behavior, 
      "drugs": 50 * crimeCategoryWeights.behavior, 

      "burglary": 50 * crimeCategoryWeights.property, 
      "other-theft": 40 * crimeCategoryWeights.property, 
      "vehicle-crime": 40 * crimeCategoryWeights.property, 
      "criminal-damage-arson": 20 * crimeCategoryWeights.property, 
      "bicycle-theft": 30 * crimeCategoryWeights.property, 
      "shoplifting": 20 * crimeCategoryWeights.property, 

      "violent-crime": 50 * crimeCategoryWeights.violent, 
      "possession-of-weapons": 30 * crimeCategoryWeights.violent, 
      "robbery": 30 * crimeCategoryWeights.violent, 
      "theft-from-the-person": 35 * crimeCategoryWeights.violent
    }

    const outcodePopulation = {}
    for (const outcode in censusData) {
      for (const postcode in censusData[outcode]) {
        const { population } = censusData[outcode][postcode]
        if (!outcodePopulation[outcode]) {
          outcodePopulation[outcode] = 0
        }
        outcodePopulation[outcode] += population
      }
    }

    const crimeScore = {}
    
    for(const month in crimeData) {
      for(const outcode in crimeData[month]) {
        if (!outcodePopulation[outcode]) {
          continue
        }
        for(const code in crimeData[month][outcode]) {
          if (!crimeScore[outcode]) {
            crimeScore[outcode] = 0
          }

          crimeScore[outcode] += (
            monthWeights[month] * 
            crimeWeight[code] * 
            crimeData[month][outcode][code].count
          ) / totalWeights / outcodePopulation[outcode] 
        }
      }
    }

    for (const postcode of [
      "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M11", "M12", "M13", "M14", "M15", "M16", "M17", "M18",
      "M19", "M20", "M21", "M22", "M23", "M24", "M25", "M26", "M27", "M28", "M29", "M30", "M31", "M32", "M33", 
      "M34", "M35", "M38", "M40", "M41", "M43", "M44", "M45", "M46", "M50", "M90", "WA1", "WA2", "WA3", "WA4",
      "WA5", "WA6", "WA7", "WA8", "WA9", "WA10", "WA11", "WA12", "WA13", "WA14", "WA15", "WA16", "SK1", "SK2",
      "SK3", "SK4", "SK5", "SK6", "SK7", "SK8", "SK9", "SK10", "SK11", "SK12", "SK13", "SK14", "SK15", "SK16", 
      "SK17", "SK22", "SK23", "OL1", "OL2", "OL3", "OL4", "OL5", "OL6", "OL7", "OL8", "OL9", "OL10", "OL11", "OL12", 
      "OL13", "OL14", "OL15", "OL16", "BL0", "BL1", "BL2", "BL3", "BL4", "BL5", "BL6", "BL7", "BL8", "BL9", "WN1",
      "WN2", "WN3", "WN4", "WN5", "WN6", "WN7", "WN8"
    ]) {
      const geoJSON = await loadPostCode(postcode)
      attachMap(geoJSON, crimeScore)
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