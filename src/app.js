import { decrypt } from "./core";

const input = document.querySelector("input");
const downloadAll = document.querySelector("#download-all");
const previewList = document.querySelector(".preview .preview-list");

input.addEventListener("change", async () => {
  for (const file of input.files) {
    let ncmFile = await file
      .arrayBuffer()
      .then((buffer) => new Uint8Array(buffer))
      .then(decrypt);

    let previewListItem = document.createElement("li");
    previewListItem.className = "preview-list-item";

    let filenameNoExt = file.name.replace(".ncm", "");

    let link = document.createElement("a");
    link.setAttribute("download", filenameNoExt);
    link.textContent = filenameNoExt;
    link.href = URL.createObjectURL(new Blob([ncmFile.music]));

    let image = document.createElement("img");
    image.src = URL.createObjectURL(new Blob([ncmFile.cover]));

    previewListItem.append(link);
    previewListItem.append(image);

    previewList.append(previewListItem);
  }
});

downloadAll.addEventListener("click", () => {
  for (const previewListItem of previewList.childNodes) {
    previewListItem.firstChild.click();
  }
});
