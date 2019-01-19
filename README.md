# Steganographic String Encoder #

This is a javascript web application which will allow you to encode/decode a string in an image.

## How encoding works ##

Every pixel in an image has a red, green, blue, and an alpha component (Alpha depends on file type, which is why I don't use it in this application). Each one of these components is one bye (0-255).

The message can be broken into an array of characters, and you can get their numerical representation as a single byte.

Now imagine I have the message "hello". If you convert that to ASCII bytes, it looks like this: "104 101 108 108 111"

So what we now have is a message represented as bytes, and some RGB components also represented as bytes, so, if I wanted to encode the firt letter, "104" (h), what I do is I convert this number to binary (1101000), which gives us a 7 bit byte, however to stay consistent, we will add padding to that byte to make it a full 8 bits, by simply adding a 0 to the beginning (which does not affect it's actual value). So we now have 01101000.

For every color component in a pixel (excluding alpha), we will be storing 1 bit of data. The way this is done is by getting the component's binary representation, and setting it's least significant bit (the rightmost bit) to the bit which we want to save/encode. This means each pixel in an image can store 3 bits of data, meaning it takes at least 3 pixels to store 1 character.

The reason for using the LSB (least significant bit) method and not just adding the values directly to the color components is that otherwise, when the decoder comes along to decode the message, without it having the original image, it would have no idea whether a color component was supposed to represent a 1 or a 0.
