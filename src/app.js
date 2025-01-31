const input = document.querySelector("input");
const downloadAll = document.querySelector("#download-all");
const previewList = document.querySelector(".preview .preview-list");
const workerURL = new URL("worker.ts", import.meta.url);

input.addEventListener("change", async () => {
  for (const file of input.files) {
    let filenameNoExt = file.name.replace(".ncm", "");

    let previewListItem = document.createElement("li");
    previewListItem.className = "preview-list-item";
    previewList.append(previewListItem);

    let loader = document.createElement("div");
    loader.className = "loader";
    previewListItem.appendChild(loader);

    previewListItem.style = "justify-content: center;";

    let worker = new Worker(workerURL);
    worker.postMessage(file);
    worker.onmessage = (e) => {
      previewListItem.removeChild(loader);

      let image = document.createElement("img");
      image.src = URL.createObjectURL(new Blob([e.data.cover]));
      previewListItem.appendChild(image);

      let link = document.createElement("a");
      link.setAttribute("download", filenameNoExt + `.${e.data.format}`);
      link.textContent = filenameNoExt;
      link.href = URL.createObjectURL(new Blob([e.data.music]));
      previewListItem.appendChild(link);

      previewListItem.style = "justify-content: space-between;";
    };
  }
});

downloadAll.addEventListener("click", () => {
  for (const previewListItem of previewList.childNodes) {
    previewListItem.querySelector("a").click();
  }
});
