function stringToUInt32(str) {
    if (str.length !== 4) {
        throw new Error("Input string must be 8 characters long.");
    }
    
    let uint32 = new Uint32Array(1);
    for (let i = 0; i < str.length; i++) {
        uint32[0] = (uint32[0] << 8) | str.charCodeAt(i);
    }
    return uint32[0];
}
  
async function sha256(message) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);                    
  
    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  
    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));
  
    // convert bytes to hex string                  
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function binaryToFloat32(bin_num) {
    let uint32Value = parseInt(bin_num, 2);
    let floatArray = new Float32Array(1);
    let uint32Array = new Uint32Array(floatArray.buffer);
    uint32Array[0] = uint32Value;
    let floatNumber = floatArray[0];
    return floatNumber
}


function decrypt_data(data,data_format,key){
    out_data = []
    let maxValue = -1000
    if(data_format == "i") {
        //console.log(key)
        //console.log(data[0]["x"] ^ key)
        for(let i=0; i < data.length; i++) {
            let decr_x = data[i]["x"] ^ key
            let decr_y = data[i]["y"] ^ key
            out_data.push({"x":decr_x, "y":decr_y})
            maxValue = max(maxValue,decr_x)
        }
    } else if (data_format == "f") {
        //console.log(key_extended.toString(2))
        //console.log(key)
        //console.log(data[0]["x"])
        //console.log(data[0]["x"].toString(2))
        //console.log(parseInt(data[0]["x"].toString(2),2) ^ key)
        //int_value = parseInt(data[0]["x"].toString(2),2) ^ key
        //stringed = int_value.toString(2)
        //console.log(binaryToFloat32(stringed))
        for(let i=0; i < data.length; i++) {
            //console.log(data[i]["x"] ^ key)
            let decr_x = binaryToFloat32((parseInt(data[i]["x"].toString(2),2) ^ key).toString(2))
            let decr_y = binaryToFloat32((parseInt(data[i]["y"].toString(2),2) ^ key).toString(2))
            out_data.push({"x":decr_x, "y":decr_y})
            maxValue = max(maxValue,decr_x)
        }
    }
    //console.log(maxValue) //min max of portrait is 2 1148
    if(maxValue > 2000) throw new Error("key wrong")
    return out_data
}