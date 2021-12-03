let baseUrl = 'http://dev.dbranch.asseco.rs';
let contentUrl = new URL('/v1/content/reponame/', baseUrl);
let paths = new Array('');
let pageSize = 40;
let currentPage = 1,
  totalPages = 1;
let selectedItem = null;
let currentFolderId = -1;
let token = '';
let envList = [
  {
    name: 'DBRANCH_DEMO',
    value: 'http://demo.dbranch.asseco.rs',
  },
  {
    name: 'CIF',
    value: 'http://demo.cif.dbranch.asseco.rs',
  },
  {
    name: 'DBRANCH_DEV',
    value: 'http://dev.dbranch.asseco.rs',
  },
];

$(document).ready(() => {
  setEnviromentVariables();
  setupDialogs();
  getFolderItems('');
  setEventListeners();
});

function setEnviromentVariables() {
  envList?.forEach((env) => {
    $('#content-url').append(`<option value="${env.value}">${env.name}</option>`);
  });

  let auth_token = localStorage.getItem('auth_token');
  // get token from local storage
  $('#content-url').val(localStorage.getItem('sel_env') ?? baseUrl);
  if (localStorage.getItem('sel_env')) baseUrl = localStorage.getItem('sel_env');
  $('#token').val(auth_token);
  token = auth_token;
}

function setupDialogs() {
  $('#dialog').dialog({ autoOpen: false });
  $('#upload-dialog').dialog({
    autoOpen: false,
    modal: true,
    height: 'auto',
    resizable: false,
    buttons: {
      Upload: function () {
        // Do something
        const selectedFile = document.querySelector('input[type="file"]').files[0];
        // get metadata info from input dialog form
        const fp = $('#filling-purpose').val();
        const fcn = $('#filling-case-number').val();
        // pass it into the upload function
        uploadDocumentToCurrentFolder(selectedFile, fp, fcn);
        $(this).dialog('close');
      },
      Cancel: function () {
        $(this).dialog('close');
      },
    },
  });
  $('#delete-confirm-dialog').dialog({
    autoOpen: false,
    modal: true,
    height: 'auto',
    resizable: false,
    buttons: {
      Delete: function () {
        // Delete
        let item = $('#delete-confirm-dialog').data('item');
        if (item.kind === 'folder') {
          deleteFolder(item.id);
        } else {
          deleteDocument(item.id);
        }
        $(this).dialog('close');
      },
      Cancel: function () {
        $(this).dialog('close');
      },
    },
  });
  $('#new-folder-dialog').dialog({
    autoOpen: false,
    modal: true,
    height: 'auto',
    resizable: false,
    buttons: {
      Add: function () {
        const folderName = $('#folder-name').val();
        addNewFolder(folderName);
        $(this).dialog('close');
      },
      Cancel: function () {
        $(this).dialog('close');
      },
    },
  });
}

function generateBreadcrumbs() {
  let breadCrumbs = $('.breadcrumbz').first();
  breadCrumbs.empty();
  paths.forEach((path) => {
    if (path === '') path = 'repo';
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

  data.items?.forEach((item) => {
    let folderIconElementString = '';

    const optionsButtonString = `<div tabindex="1" class="menu-button" >
      <img src="assets/more.svg" width="14" alt="">
    </div>`;

    switch (item.kind) {
      case 'folder':
        folderIconElementString = `<img src="assets/folder.svg" width="48" alt="">`;
        break;
      case 'document':
        folderIconElementString = `<div style="width: 48px; height: 48px"><img style="max-width:100%;
        max-height:100%;" src="${getDocumentType(item)}"  alt=""></div>`;
        break;
      default:
        break;
    }

    // TODO: change this later
    const name = item?.name?.length > 19 ? item.name.substring(0, 16) + '...' : item.name;

    const folderItemString = `
        <div class="item" tabindex="0">
            ${folderIconElementString} <div class="menu"  tabindex="1" id="${item.id}" >${optionsButtonString}</div> 
            <div title="${item.name}" class="item-text">${name}</div>
        </div>`;

    const folderItemElement = $.parseHTML(folderItemString);
    if (item.kind === 'folder') {
      $(folderItemElement).on('dblclick', () => {
        getFolderItems(item, true);
      });
    }

    $(folderItemElement)
      .find('.menu-button')
      .on('click', (e) => {
        if ($(`#${idParser(item.id)}`).children('.dropdown').length) {
          $(`#${idParser(item.id)}`)
            .children('.dropdown')
            .remove();
        } else {
          console.log('open the dropdown');
          openItemOptions(item);
        }
      });
    $('.container').append(folderItemElement);
  });
}

/**
 * Open dropdown for item to download, delete or open info
 * @param {Object} item Folder or document item to set options
 */
function openItemOptions(item) {
  // display the dropdown when we click the dropdown button
  $(`#${idParser(item.id)}`)
    .children()
    .first()
    .css({ filter: 'opacity(1)', filter: 'drop-shadow(0 0 0.15rem rgba(0, 0, 0, 0.329))' });

  let dropdownElement = $.parseHTML(`<div tabindex="1" class="dropdown"></div>`);

  $(dropdownElement).on('blur', () => {
    $(`#${idParser(item.id)}`)
      .children()
      .first()
      .css({ filter: '' });
    $(`#${idParser(item.id)}`)
      .children('.dropdown')
      .remove();
  });

  let options = ['Delete', 'Information'];
  if (item.kind === 'document') options.push('Download');

  // add all the options depending on type
  options.forEach((option) => {
    contentUrl = new URL('/v1/content/reponame/', baseUrl);
    let optionItemElement = $.parseHTML(`<div class="option-item">${option}</div>`);

    $(optionItemElement).on('click', (e) => {
      if (option === 'Download') {
        let name = decodeURIComponent(item.name);
        openInNewTab(contentUrl.href + paths.slice(1, paths.length).join('/') + '/' + name);
      } else if (option === 'Delete') {
        $('#delete-confirm-dialog').data('item', item).dialog('open');
        if (item.kind === 'folder') {
          $('#folder-warn').html('Warning, you are about to delete all subfolders and its contents!');
        } else {
          $('#folder-warn').html('');
        }
      } else if (option === 'Information') {
        getItemMetadata(item).then((itemMetadata) => {
          $('#dialog').empty();
          $('#dialog').dialog({ width: 'auto', height: 'auto' });
          Object.entries(itemMetadata).forEach(([key, value]) => {
            if (typeof value === 'object') value = JSON.stringify(value);
            $('#dialog').append(`<div class="info-row"><div class="label">${key}:</div> <div>${value}</div></div>`);
            $('#dialog').dialog('open');
          });
        });
      }
    });
    $(dropdownElement).append(optionItemElement);
  });

  $(`#${idParser(item.id)}`).append(dropdownElement);
  $(dropdownElement).focus();
}

// TODO: Maybe add parameter for id and folder purpose

/**
 * Adds new folder to current path with specified name
 * @param {string} folderName
 */
async function addNewFolder(folderName) {
  contentUrl = new URL('/v1/content/reponame/', baseUrl);
  const folderId = Math.floor(100000 + Math.random() * 900000);
  const path = paths.join('/') === '' ? '/' : paths.join('/');
  const folderBody = {
    id: folderId,
    changedOn: new Date(),
    createdOn: new Date(),
    name: folderName,
    kind: 'folder',
    path: path,
    folderPurpose: 'generic-folder',
  };
  let response = await fetch(contentUrl.href + 'folders/', {
    headers: {
      'Accept': '*/*',
      'Authorization': `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(folderBody),
    method: 'POST',
  });

  console.log(response);
  getFolderItems(paths[paths.length - 1]);
}

/**
 * Delete selected folder and all the folders bellow it
 * @param {number} folderId Folder id to be deleted
 */
async function deleteFolder(folderId) {
  let response = await fetch(contentUrl.href + 'folders/' + folderId + '?delete-content-and-subfolders=true', {
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
 * Delete selected document
 * @param {number} documentId id of document to be deleted
 */
async function deleteDocument(documentId) {
  let response = await fetch(contentUrl.href + 'documents/' + documentId, {
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
 * Gets folder or file information of the selected item
 * @param {Object} item Folder or file item in focus
 * @returns metadata of the input item
 */
async function getItemMetadata(item) {
  contentUrl = new URL('/v1/content/reponame/', baseUrl);
  let respone = await fetch(contentUrl.href + item.kind + 's/' + item.id + '/metadata');
  let metadata = await respone.json();

  return metadata;
}

/**
 * Get items for selected folder
 * @param {(string | Object)} folder Can be a folder name or a folder object
 * @param {boolean} levelChange Indicates if we are changing to another level
 */
async function getFolderItems(folder, levelChange) {
  $('.loader').css('display', 'initial');
  $('#dialog').dialog('close');
  let url = new URL('/v1/content/reponame/', baseUrl);

  // reset the current page in case we are on
  // a page that is > 1 and switch to a level
  // that has only one page.
  if (levelChange) currentPage = 1;

  if (typeof folder === 'string') {
    if (!paths.includes(folder)) folder = '';
    paths = paths.slice(0, paths.indexOf(folder) + 1);
    url.pathname += paths.join('/');
  } else {
    paths = (folder.path + (folder.path === '/' ? '' : '/') + folder.name).split('/');
    url.pathname += paths.slice(1, paths.indexOf(folder.name) + 1).join('/');
  }
  url.searchParams.append('page-size', pageSize);
  url.searchParams.append('page', currentPage.toString());
  const response = await fetch(url.href);
  const data = await response.json();

  $('.loader').css('display', 'none');
  generateCurrentFolderItems(data);
  generateBreadcrumbs();
}

function goUp() {
  currentPage = 1;
  paths.pop();
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
    iconPath = contentUrl.href + paths.slice(1, paths.length).join('/') + '/' + item.name;
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

  $('#upload-button').on('click', (e) => {
    $('#upload-field').val('');
    $('#upload-field').click();
  });

  $('#upload-field').change((e) => {
    $('#upload-dialog').dialog('open');
  });

  $('#new-folder').click((e) => {
    $('#new-folder-dialog').dialog('open');
  });

  $('.delete').on('click', (e) => {
    deleteFolder(selectedItem.id);
  });

  $('#content-url').change((e) => {
    const env = $('#content-url option:selected').val();
    localStorage.setItem('sel_env', env);
    baseUrl = $('#content-url').val();
    getFolderItems(paths[0], true);
    console.log('changed to: ', baseUrl);
  });

  $('#forward-start').on('click', (e) => {
    if (currentPage !== 1) {
      currentPage = 1;
      getFolderItems(paths[paths.length - 1]);
    }
  });

  $('#forward-end').on('click', (e) => {
    if (currentPage !== totalPages) {
      currentPage = totalPages;
      getFolderItems(paths[paths.length - 1]);
    }
  });

  $('#token').on('change', (e) => {
    token = $('#token').val();
    localStorage.setItem('auth_token', token);
  });

  $('#paste-token').on('click', async () => {
    const copied_token = await navigator.clipboard.readText();
    $('#token').val(copied_token);
  });
}

/**
 * Some html ids have special characters that jquery cannot handle correctly
 * ie. $('#123.345') -> id = 123 class = 345 instead of id = 123.345
 * so we parse the id string using this helper method
 * @returns escaped id string
 */
function idParser(myid) {
  return myid.replace(/(:|\.|\[|\]|,|=|@)/g, '\\$1');
}
