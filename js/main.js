/*
    Made by PepperedJerky

    Notes:

    1. Every character in a message is represented as an ASCII byte, which is 8 bits (padding is added if a character is less than 8 bits).
    2. 24 bits (3 bytes) are reserved in each image to store the message length. This means the first 8 pixels are reserved.
    3. 3 bits are stored per pixel (1 bit (The LSB) per RGB component). Alpha component for each pixel is left alone.

    Todo:

    1. Make LSB amount usage variable.
    2. Make set and get LSB functions use bitwise operators instead of substring crap.
*/

window.onload = function() {
    //----------------------------------------[VARIABLES]----------------------------------------

    let canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        link = document.createElement('a'), //For force downloading canvas image
        maxMsgLength = 0,
        fileSelector = document.createElement('input'), //Hidden file selector input, programatically clicked when 'selectFile' button is clicked
        selectFile = document.getElementById('selectFile'),
        selectedFile = document.getElementById('file'),
        messageBox = document.getElementById('messageBox'),
        charCount = document.getElementById('charCount'),
        encode = document.getElementById('encode'),
        decode = document.getElementById('decode'),
        img = new Image;

    //----------------------------------------[INITIALIZATIONS]----------------------------------------

    fileSelector.setAttribute('type', 'file');
    fileSelector.setAttribute('accept', 'image/png, image/jpeg');

    //----------------------------------------[EVENTS]----------------------------------------

    selectFile.onclick = function() {
        fileSelector.click();
    }

    messageBox.oninput = function() {
        let msgLength = messageBox.value.length;

        charCount.innerHTML = msgLength + "/" + maxMsgLength;

        if(msgLength > maxMsgLength) {
            charCount.style.color = "#F00";
        } else {
            charCount.style.color = "#FFF";
        }
    }

    encode.onclick = function() {
        if(checkFileValid(fileSelector)) {
            let imageData = ctx.getImageData(0, 0, img.width, img.height);

            encodeInImage(imageData, messageBox.value, function(data) {
                downloadImagedata(data, 'stego.png');
            });
        }
    }

    decode.onclick = function() {
        if(checkFileValid(fileSelector)) {
            let imageData = ctx.getImageData(0, 0, img.width, img.height);

            decodeFromImage(imageData, function(data) {
                messageBox.value = data;
            });
        }
    }

    fileSelector.onchange = function() {
        img.src = URL.createObjectURL(fileSelector.files[0]);
        selectedFile.value = fileSelector.files[0].name;
    }

    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        maxMsgLength = Math.floor(clamp(((((img.width*img.height)*3)/8)-3), 0, 524285)); //Set max message length to the max that currently selected image will be able to handle

        ctx.drawImage(img, 0, 0);
    }

    //----------------------------------------[FUNCTIONS]----------------------------------------
    
    function encodeInImage(imageData, message, callback) {
        let data = imageData.data;
        let msgBin = ""; //Message converted to binary
        let msgLength = message.length;
        let pixels = imageData.width * imageData.height;
        let msgLengthBin = (message.length).toString(2); //Message length in binary. To be encoded at beginning of image.

        msgLengthBin = "0".repeat((24-msgLengthBin.length)) + msgLengthBin;

        if(msgLength > maxMsgLength || msgLength < 1) {
            return alert("Message must be no longer than " + maxMsgLength + " characters, and no less than 1");
        }

        if(pixels < 11) {
            return alert("Image must contain at least 11 total pixels!");
        }

        for(let i = 0; i<message.length; i++) { //Get message in binary
            binChar = (message.charCodeAt(i)).toString(2);
            msgBin += "0".repeat((8-binChar.length)) + binChar; //Ensure that each character in binary is 8 bits long by adding padding
        }

        for(let i = 0; i<32; i++) { //Encodes message length at beginning of image
            if(i % 4 == 0) {
                let currentChar = (i-(i/4));

                let rgbBin = getRGB_Bin(data, i);

                for(let i2 = 0; i2<3; i2++) {
                    data[i+i2] = setLSB(msgLengthBin.charAt(currentChar+i2), rgbBin[i2]);
                }
            }
        }

        let msgBinLength = msgLength*8;

        for(let i = 32; i<=((msgBinLength)+Math.ceil((msgBinLength)/3))+32; i++) { //Encodes message in image
            if(i % 4 == 0) { //Every 4th element of image data is the beginning of a new pixel's RGBA components
                let currentChar = ((i-32)-((i-32)/4));

                let rgbBin = getRGB_Bin(data, i);

                let bitsBuffer = clamp((msgBin.length - currentChar), 0, 3); //Stores how many bits still need to be encoded, but only up to next 3, since we can only store 3 bits per pixel

                for(let i2 = 0; i2<bitsBuffer; i2++) {
                    data[i+i2] = setLSB(msgBin.charAt(currentChar+i2), rgbBin[i2]); //Set the current color component's least significant bit to the current bit in bitsBuffer.
                }
            }
        }

        callback(imageData);
    }

    function decodeFromImage(imageData, callback) {
        let data = imageData.data;
        let msgLengthBin = ""; //For storing message length in binary
        let msgBinLength; //Amount of bits encoded in image
        let msgBin = []; //Array of every 8 bits in binary. The decoder stores every 8 bits here, so each index is an ASCII character in binary form
        let message = ""; //Where decoded message will be stored
        let pixels = imageData.width * imageData.height;

        if(pixels < 11) {
            return alert("Image must contain at least 11 total pixels!");
        }

        for(let i = 0; i<32; i++) { //Gets message length
            if(i % 4 == 0) {
                for(let i2 = 0; i2<3; i2++) {
                    msgLengthBin += getLSB((data[i+i2]).toString(2));
                }
            }
        }

        msgBinLength = parseInt(msgLengthBin, 2)*8;
        
        if((msgBinLength/8) > (Math.floor((pixels*3)/8)-3)) {
            return alert("Image is invalid/corrupted!");
        }

        for(let i = 32; i<=(msgBinLength+Math.ceil(msgBinLength/3))+32; i++) { //Decodes message from image
            if(i % 4 == 0) {
                let currentChar = ((i-32)-((i-32)/4));

                let bitsBuffer = clamp((msgBinLength - currentChar), 0, 3);
                //console.log(bitsBuffer);

                for(let i2 = 0; i2<bitsBuffer; i2++) {
                    let currentIndex = Math.floor((currentChar+i2)/8);

                    if((currentChar+i2)%8 == 0) {
                        msgBin[currentIndex] = "" //Initialize this index if first time addressing it
                    }

                    msgBin[currentIndex] += getLSB((data[i+i2]).toString(2)); //Get the current color component's least significant bit and appends it in the current char's index
                }
            }
        }

        for(let i = 0; i<msgBin.length; i++) { //Go through every binary character in msgBin, convert to ASCII char, and append to message variable
            message += String.fromCharCode(parseInt(msgBin[i], 2));
        }

        callback(message);
    }

    function checkFileValid(fileSelector) { //Make sure file is selected and is of valid image file type
        let validFiles = ["image/png", "image/jpeg"];
        let file = fileSelector.files[0];
        let valid = false;

        if(fileSelector.value != "") {
            for(let i = 0; i<validFiles.length; i++) {
                if(file.type == validFiles[i]) {
                    valid = true;
                    break;
                }
            }
        } else {
            alert("No file uploaded!");
        }

        if(!valid) {
            alert("Invalid file type!");
        }

        return valid;
    }

    function downloadImagedata(imageData, fileName) { //Download imageData as image
        let dCanvas = document.createElement('canvas'),
            dCtx = dCanvas.getContext('2d');

        dCanvas.width = imageData.width;
        dCanvas.height = imageData.height;

        dCtx.putImageData(imageData, 0, 0);

        link.download = fileName;
        link.href = dCanvas.toDataURL();
        link.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
    }

    function getRGB_Bin(pixelArray, index) { //Gets the red, green, and blue components of a pixel in binary form
        return [
            (pixelArray[index]).toString(2),
            (pixelArray[index+1]).toString(2),
            (pixelArray[index+2]).toString(2),
        ]
    }

    function clamp(num, min, max) { //Restrict 'num' within range of 'min' and 'max'
        return num <= min ? min : num >= max ? max : num;
    }

    function setLSB(bit, byte) { //Set least significant bit of byte 'byte'
        byte = byte.substring(0, byte.length - 1) + bit;
        return parseInt(byte, 2);
    }

    function getLSB(byte) { //Get least significant bit of byte 'byte'
        return byte.substring(byte.length-1);
    }
}