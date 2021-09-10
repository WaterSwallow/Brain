  // Mohamed Masoud 2021 (Sergey Plis Lab)
  // For [1, 38, 38, 38, 1] input shape, MeshNet model

  // Main parameters:
  rawNiftiData = [];

  niftiHeader = [];

  //ArrayBuffer
  niftiImage = [];

  //Object
  labelNiftiHeader = [];

  //ArrayBuffer
  labelNiftiImage = [];  
  //Flag
  gtLabelLoaded = false;

  readNIFTIBasics = (data) => {

      // parse nifti
      if (nifti.isCompressed(data)) {
          data = nifti.decompress(data);
      }

      if (nifti.isNIFTI(data)) {
          // have raw nifti data to use for save
          rawNiftiData = data;
          niftiHeader = nifti.readHeader(data);
          niftiImage = nifti.readImage(niftiHeader, data);
      }

  }    

//rawData is ArrayBuffer, header is object, data is array
getNiftiOutArrayBuffer= function (header, rawData, data) {
    let imageData = [];
    let outNifti = []
    let headerArrBuf = [];
    let outImageArray = [];

    let imageOffset = header.vox_offset,
        timeDim = 1,
        statDim = 1;

    if (header.dims[4]) {
        timeDim = header.dims[4];
    }

    if (header.dims[5]) {
        statDim = header.dims[5];
    }

    let imageSize = header.dims[1] * header.dims[2] * header.dims[3] * timeDim * statDim * (header.numBitsPerVoxel / 8);

    headerArrBuf = rawData.slice(0, imageOffset);

    // Convert to normal array
    hearderArray = arrayBuffer2Array(headerArrBuf);

    outImageArray = hearderArray.concat(data)

    return    array2ArrayBuffer(outImageArray); 
};

// Convert array to ArrayBuffer
function array2ArrayBuffer(array) {
    // convert array to typedarray
    let typedArray = Uint8Array.from(array);
    // Convert typedArray to ArrayBuffer and return ArrayBuffer
    return typedArray.buffer.slice(typedArray.byteOffset, typedArray.byteLength + typedArray.byteOffset)
}

 
function arrayBuffer2Array(arrayBuffer) {
    // convert arrayBuffer to TypedArray
    let typedArrData = new Uint8Array(arrayBuffer);
    // convert typedArray to array
    let arr = [...typedArrData];
    return arr;
}

function downloadNifti(mriData){
      var downloadFileData = (function () {
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        return function (data, fileName) {
            // create Blob "Binary Large Object" of type octet-binary for the ArrayBuffer
            var blob = new Blob([data], {type: "application/octet-binary;charset=utf-8"});
            var url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
            };
     }());


     let fileName = $$("fileNameToDL").getValue();
     
     if(fileName.search(".nii") < 0) { // if no nii extension then search will return -1
       fileName = fileName + ".nii";
     }

     //Get the data ArrayBuffer
     var data = getNiftiOutArrayBuffer(niftiHeader, rawNiftiData, mriData);
     // fileName = "outMRI"+"_3dFilter"+".nii";



     if (nifti.isNIFTI(data)) {
          // save arraybuffer data to disk  
          downloadFileData(data, fileName);
      } else {
          console.log("Not Nifti data....... ");
      }   
}

  readNIFTILabels = (data) => {
 
      let gtCanvas = document.getElementById('gtCanvas');       
      let slider = document.getElementById('sliceNav');

      // parse nifti
      if (nifti.isCompressed(data)) {
          data = nifti.decompress(data);
      }

      gtLabelLoaded = true;

      if (nifti.isNIFTI(data)) {
          labelNiftiHeader = nifti.readHeader(data);
          labelNiftiImage = nifti.readImage(labelNiftiHeader, data);

      }


      // draw slice
      drawGtCanvas(gtCanvas, slider.value, labelNiftiHeader, labelNiftiImage);
  } 

  drawInputCanvas = (canvas, sliceIdx, niftiHeader, niftiImage) => {
      // get nifti dimensions
      let cols = niftiHeader.dims[1];
      let rows = niftiHeader.dims[2];

      // set canvas dimensions to nifti slice dimensions
      canvas.width = cols;
      canvas.height = rows;
     

      // make canvas image data
      let ctx = canvas.getContext("2d");
      let canvasImageData = ctx.createImageData(canvas.width, canvas.height);

      // convert raw data to typed array based on nifti datatype
      let typedData;

      if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
          typedData = new Uint8Array(niftiImage);
      } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
          typedData = new Int16Array(niftiImage);
      } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
          typedData = new Int32Array(niftiImage);
      } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
          typedData = new Float32Array(niftiImage);
      } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
          typedData = new Float64Array(niftiImage);
      } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
          typedData = new Int8Array(niftiImage);
      } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
          typedData = new Uint16Array(niftiImage);
      } else if (niftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
          typedData = new Uint32Array(niftiImage);
      } else {
          return;
      }

      // offset to specified slice
      let sliceSize = cols * rows;
      let sliceOffset = sliceSize * sliceIdx;

      // draw pixels
      for (let row = 0; row < rows; row++) {
          let rowOffset = row * cols;

          for (let col = 0; col < cols; col++) {
              let offset = sliceOffset + rowOffset + col;
              let value = typedData[offset];

              /* 
                 Assumes data is 8-bit, otherwise you would need to first convert 
                 to 0-255 range based on datatype range, data range (iterate through
                 data to find), or display range (cal_min/max).
                 
                 Other things to take into consideration:
                   - data scale: scl_slope and scl_inter, apply to raw value before 
                     applying display range
                   - orientation: displays in raw orientation, see nifti orientation 
                     info for how to orient data
                   - assumes voxel shape (pixDims) is isometric, if not, you'll need 
                     to apply transform to the canvas
                   - byte order: see littleEndian flag
              */
              canvasImageData.data[(rowOffset + col) * 4] = value & 0xFF;
              canvasImageData.data[(rowOffset + col) * 4 + 1] = value & 0xFF;
              canvasImageData.data[(rowOffset + col) * 4 + 2] = value & 0xFF;
              canvasImageData.data[(rowOffset + col) * 4 + 3] = 0xFF;

          }
      }

      ctx.putImageData(canvasImageData, 0, 0);

  }

function labelMax(arr){
   let max = arr[0];
   for(let i=1; i<arr.length; i++){
     if(arr[i] > max){
       max = arr[i];   
     }
    }
  return max;
}  

drawGtCanvas = (canvas, sliceIdx, labelNiftiHeader, labelNiftiImage) => {
      // get nifti dimensions
      let cols = labelNiftiHeader.dims[1];
      let rows = labelNiftiHeader.dims[2];

      // set canvas dimensions to nifti slice dimensions
      canvas.width = cols;
      canvas.height = rows;
     

      // make canvas image data
      let ctx = canvas.getContext("2d");
      let canvasImageData = ctx.createImageData(canvas.width, canvas.height);

      // convert raw data to typed array based on nifti datatype
      let typedData;

      if (labelNiftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
          typedData = new Uint8Array(labelNiftiImage);
      } else if (labelNiftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
          typedData = new Int16Array(labelNiftiImage);
      } else if (labelNiftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
          typedData = new Int32Array(labelNiftiImage);
      } else if (labelNiftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
          typedData = new Float32Array(labelNiftiImage);
      } else if (labelNiftiHeader.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
          typedData = new Float64Array(labelNiftiImage);
      } else if (labelNiftiHeader.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
          typedData = new Int8Array(labelNiftiImage);
      } else if (labelNiftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
          typedData = new Uint16Array(labelNiftiImage);
      } else if (labelNiftiHeader.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
          typedData = new Uint32Array(labelNiftiImage);
      } else {
          return;
      }

      
      let n_classes = labelMax(typedData) + 1;
      // document.getElementById("results").innerHTML = "Found " + n_classes.toString().fontcolor("green").bold() + " classes in the ground truth";

      // offset to specified slice
      let sliceSize = cols * rows;
      let sliceOffset = sliceSize * sliceIdx;

      // draw pixels
      for (let row = 0; row < rows; row++) {
          let rowOffset = row * cols;

          for (let col = 0; col < cols; col++) {
              let offset = sliceOffset + rowOffset + col;
              let value = typedData[offset];

              /* 
                 Assumes data is 8-bit, otherwise you would need to first convert 
                 to 0-255 range based on datatype range, data range (iterate through
                 data to find), or display range (cal_min/max).
                 
                 Other things to take into consideration:
                   - data scale: scl_slope and scl_inter, apply to raw value before 
                     applying display range
                   - orientation: displays in raw orientation, see nifti orientation 
                     info for how to orient data
                   - assumes voxel shape (pixDims) is isometric, if not, you'll need 
                     to apply transform to the canvas
                   - byte order: see littleEndian flag
              */
              value = Math.ceil(value*255/(n_classes - 1))

              canvasImageData.data[(rowOffset + col) * 4] = value & 0xFF;
              canvasImageData.data[(rowOffset + col) * 4 + 1] = value & 0xFF;
              canvasImageData.data[(rowOffset + col) * 4 + 2] = value & 0xFF;
              canvasImageData.data[(rowOffset + col) * 4 + 3] = 0xFF;

          }
      }

      ctx.putImageData(canvasImageData, 0, 0);

  }

  

  makeSlice = (file, start, length) => {
      var fileType = (typeof File);

      if (fileType === 'undefined') {
          return function () {};
      }

      if (File.prototype.slice) {
          return file.slice(start, start + length);
      }

      if (File.prototype.mozSlice) {
          return file.mozSlice(start, length);
      }

      if (File.prototype.webkitSlice) {
          return file.webkitSlice(start, length);
      }

      return null;
  }

  readFile = (file, sourceId) => {
      console.log("file is :", file)

      var blob = makeSlice(file, 0, file.size);

      var reader = new FileReader();

      reader.onloadend = function (evt) {
          if (evt.target.readyState === FileReader.DONE) {
 
              // document.getElementById("results").innerHTML = "";

              //evt.target.result is :  ArrayBuffer { byteLength: 763810 }
              if(sourceId == "file") {
                  readNIFTI(evt.target.result);
           
              }

              if(sourceId == "groundTruthFile") {
                 readNIFTILabels(evt.target.result);   
                 // document.getElementById("gtTitle").innerHTML = "Ground Truth";    
                 document.getElementById("groundTruthFile").disabled = true;              
              }

              allOutputSlices = [];
              allOutputSlices2DCC = [];
              allOutputSlices3DCC = [];
          }
      };

      reader.readAsArrayBuffer(blob);
  }

  handleFileSelect = (evt) => {
      let files = evt.target.files;
      let source = evt.target || evt.srcElement;
      readFile(files[0],source.id);
  }


