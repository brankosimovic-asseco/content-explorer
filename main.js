let baseUrl = 'http://demo.dbranch.asseco.rs';
let contentUrl = new URL('/v1/content/reponame/', baseUrl);
let paths = new Array('');
let currentPage = 1, totalPages = 1;
let selectedItem = null;
let currentFolderId = -1;
let token = `eyJhbGciOiJSUzI1NiIsImtpZCI6IkI1Q0MxMTdBRjdGNTNFNEY3RDg0NDZDMkE0M0VEOTY0NTBCNTc3NzBSUzI1NiIsInR5cCI6ImF0K2p3dCIsIng1dCI6InRjd1JldmYxUGs5OWhFYkNwRDdaWkZDMWQzQSJ9.eyJuYmYiOjE2MjAyMjY1MTMsImV4cCI6MTYyMDI1NTMxMywiaXNzIjoiaHR0cDovL2RlbW8uZGJyYW5jaC5hc3NlY28ucnMvdjEvYXV0aGVudGljYXRpb24iLCJhdWQiOlsiYnBtIiwiY29uZmlndXJhdGlvbiIsImNvbW1lbnRzIiwiY29yZS1pbnRlZ3JhdGlvbiIsIm9mZmVyIiwiY29udGVudCIsImRlY2lzaW9uIiwiZG9jdW1lbnQtY29tcG9zaXRpb24iLCJkaXJlY3RvcnkiXSwiY2xpZW50X2lkIjoic2hlbGwtdWkiLCJzdWIiOiI3MTNhYzM3My0zMzcyLTRkN2EtODUwNy00MjA1MTI2ZGNkMzgiLCJhdXRoX3RpbWUiOjE2MjAyMjY1MTMsImlkcCI6ImRlZmF1bHQiLCJyb2xlIjpbIk9wZXJhdGlvbiBvZmZpY2VyLDAwMDEiLCJCcmFuY2ggbWFuYWdlciwwMDAxIiwiUmVsYXRpb25zaGlwIG1hbmFnZXIiLCJVbmRlcndyaXRlciIsIkhlYWQgb2YgdW5kZXJ3cml0aW5nIiwiQWRtaW4sMDAwMSIsIkNyZWRpdCBBZG1pbiJdLCJtYWluX29yZ2FuaXphdGlvbl91bml0IjoiMDAwMSIsInVzZXJfdHlwZSI6IkFkbWluIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiYnJhbmtvLnNpbW92aWMiLCJzY29wZSI6WyJvcGVuaWQiLCJwcm9maWxlIiwiYnBtIiwiY29uZmlndXJhdGlvbiIsImNvbW1lbnRzIiwiY29yZS1pbnRlZ3JhdGlvbiIsIm9mZmVyIiwiY29udGVudCIsImRlY2lzaW9uIiwiZG9jdW1lbnQtY29tcG9zaXRpb24iLCJkaXJlY3RvcnkiXSwiYW1yIjpbImV4dGVybmFsIl19.ewMEhLjPwAHpUQyP8UxrQOPxC_ONxUPbsNqnXPFc9F205mz-AbKLgMKdUvr_LBHxa7OlmTCSBofE07T57g5m-fJRHmOpWk9fRTYgBCtLWcUr8raF5oG6nUq4p4MYlznPkY294xIcZqxXofOHtQyaCus5Dy5-PJuNYpvbwI7r5qqqpErSjyEPhhrTbPoBjyi1nQdU26HeAVPiafCZhuX_sFH3beXUW2VYUvIu-bNTWCc_A-bKBWayTvLCjVmnE6FHNB0N4l1q_QnxnllMGmVb0Jfg7N2glmkS_TSZcpzih3dl1k6nV0u6WBCt3sGRSIbHBW4aqEbwcRS65_KkSRmljQ`;

$(document).ready(() => {
  getFolderItems('');
  setEventListeners();
});

function generateBreadcrumbs() {
  let breadCrumbs = $('.breadcrumbz').first();
  breadCrumbs.empty();
  paths
    .forEach((path) => {
      if(path === '') path = 'repo'; 
      const breadCrumbElementString = `<div class="path">${path}</div>`;
      const breadCrumbElement = $.parseHTML(breadCrumbElementString);

      $(breadCrumbElement).on('click', (e) => {
        const folderName = $(e.currentTarget).text();
        getFolderItems(folderName, true);
      });
      breadCrumbs.append(breadCrumbElement);
    });
}

/**
 * Draw the current folder panel
 * @param {Object} data collection of folder items and paging info
 */
function generateCurrentFolderItems(data) {
  totalPages = data['total-pages'] === 0 ? 1 : data['total-pages'];

  $('#page-info').html(`${data.page}/${totalPages}`);

  let emptyFolderElementString = `<div class="empty">
        <img src="assets/empty.svg" width="38" alt="">
        <div class="empty-folder">This folder is empty </div>
        </div>`;

  $('.container').empty();

  if (!data.items || data.items.length === 0) {
    let emptyFolderElement = $.parseHTML(emptyFolderElementString);
    $('.container').append(emptyFolderElement);
  }

  data.items.forEach((item) => {
    let folderIconElementString = '';

    const downloadIconString =
      item.kind === 'folder'
        ? ''
        : `<div class="download-button"><img src="assets/download.svg" width="28" alt=""></div>`;

    switch (item.kind) {
      case 'folder':
        folderIconElementString = `<img src="assets/folder.svg" width="48" alt="">`;
        break;
      case 'document':
        folderIconElementString = `<div><img src="${getDocumentType(
          item
        )}" width="48" alt=""></div>${downloadIconString}`;
        break;
      default:
        break;
    }

    // TODO: change this later
    const name = item?.name?.length > 19 ? item.name.substring(0, 19) + '...' : item.name;

    const folderItemString = `
        <div class="item" tabindex="0">
            ${folderIconElementString}   
            <div title="${item.name}" class="item-text">${name}</div>
        </div>`;

    const folderItemElement = $.parseHTML(folderItemString);
    if (item.kind === 'folder') {
      $(folderItemElement).on('dblclick', () => {
        getFolderItems(item, true);
      });
    } else {
      $(folderItemElement)
        .children('.download-button')
        .on('click', () => {
          let name = decodeURIComponent(item.name);
          openInNewTab(contentUrl.href + paths.slice(1, paths.length).join('/') + '/' + name);
        });
    }
    $(folderItemElement).on('click', (e) => {
      // console.log(item);
      selectedItem = item;
    });

    $('.container').append(folderItemElement);
  });
}

/**
 * Delete selected folder and all the folders bellow it
 * @param {number} folderId Folder id to be deleted
 */
async function deleteFolder(folderId) {
  let response = await fetch(contentUrl.href + '/folders' + folderId, {
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`,
    },
    method: 'DELETE',
  });

  console.log(response);
  getFolderItems(paths[paths.length - 1]);
}

/**
 * Get items for selected folder
 * @param {(string | Object)} folder Can be a folder name or a folder object
 * @param {boolean} levelChange Indicates if we are changing to another level
 */
async function getFolderItems(folder, levelChange) {

  $('.loader').css('display', 'initial');

  let url = new URL('/v1/content/reponame/', baseUrl);
  // reset the current page in case we are on
  // a page that is > 1 and switch to a level
  // that has only one page.
  if (levelChange) currentPage = 1;

  if (typeof folder === 'string') {

    if(!paths.includes(folder)) folder = '';
    paths = paths.slice(0, paths.indexOf(folder) + 1);
    url.pathname += paths.join('/');
  } else {
    paths = (folder.path + (folder.path === '/' ? '' : '/') + folder.name).split('/');
    url.pathname += paths.slice(1, paths.indexOf(folder.name) + 1).join('/');
  }
  url.searchParams.append('page-size', '40');
  url.searchParams.append('page', currentPage.toString())
  const response = await fetch(url.href);
  const data = await response.json();

  $('.loader').css('display', 'none');
  generateCurrentFolderItems(data);
  generateBreadcrumbs();
}

function goUp() {
  paths.pop();
  currentPage = 1;
  getFolderItems(paths[paths.length - 1]);
}

function openInNewTab(url) {
  window.open(url, '_blank').focus();
}

/**
 * Upload file to content
 * @param {File} file Input file to be uploaded
 */
async function uploadDocumentToCurrentFolder(file, fillingPurpose, filingCaseNumber) {
  let response = await fetch(contentUrl.href + paths.join('/') + '/metadata');
  let metadata = await response.json();
  console.log(metadata.id);
  currentFolderId = metadata.id;

  let formData = new FormData();

  // enter filing purpose and case number from dialog

  formData.set('content-stream', file);
  formData.set('name', file.name);
  formData.set('media-type', file.type);
  formData.set('filing-purpose', fillingPurpose);
  formData.set('filing-case-number', filingCaseNumber);
  formData.set('overwrite-if-exists', true);

  let uploadResponse = fetch(contentUrl.href + 'folders/' + currentFolderId, {
    method: 'POST',
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const content = await uploadResponse;
  getFolderItems(paths[paths.length - 1]);
  console.log(content);
}

/**
 *
 * @param {Object} item folder item that contains the media type
 * @returns {string} icon name based on media type
 */
function getDocumentType(item) {
  let iconPath = '';
  if (item['media-type'].split('/')[0] === 'image') {
    iconPath = 'assets/image.svg';
  } else if (item['media-type'].split('/')[1] === 'pdf') {
    iconPath = 'assets/pdf-file.svg';
  } else if(item['media-type'].split('/')[1] === 'vnd.openxmlformats-officedocument.wordprocessingml' ||
            item['media-type'].split('/')[1] ===  'vnd.openxmlformats-officedocument.wordprocessingml.document') {
    iconPath = 'assets/doc-file.svg';
  } else {
    iconPath = 'assets/doc.svg';
  }
  return iconPath;
}

function setEventListeners() {
  $('#back-button').on('click', () => {
    if (currentPage > 1) {
      currentPage = currentPage - 1;
      getFolderItems(paths[paths.length - 1]);
    }
  });

  $('#forward-button').on('click', () => {
    if (currentPage < totalPages) {
      currentPage = currentPage + 1;
      getFolderItems(paths[paths.length - 1]);
    }
  });

  $('#up').on('click', () => {
    if (paths.join('') !== '') {
      goUp();
    }
  });

  $('.upload-button').on('click', (e) => {
    $('#upload-field').val('');
    $('#upload-field').click();
  });

  $('.delete').on('click', (e) => {
    deleteFolder(selectedItem.id);
  });

  $('#upload').on('click', () => {
    const selectedFile = document.querySelector('input[type="file"]').files[0];
    // get metadata info from input dialog form
    const fp = $('#filling-purpose').val();
    const fcn = $('#filling-case-number').val();
    // pass it into the upload function
    uploadDocumentToCurrentFolder(selectedFile, fp, fcn);
    $('.dialog').css('display', 'none');
    $('#overlay').css('display', 'none');
  })

  $('#upload-field').change(() => {
    $('.dialog').css('display', 'initial');
    $('#overlay').css('display', 'initial');
  });

  $('#close-upload').on('click',() => {
    $('.dialog').css('display', 'none');
    $('#overlay').css('display', 'none');
  });
}
