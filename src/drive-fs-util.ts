
export const getFolders = (folderId?: string) => {
  const currentFolder = !folderId ? DriveApp.getRootFolder() : DriveApp.getFolderById(folderId);
  const iterator = currentFolder.getFolders();
  const folders:GoogleAppsScript.Drive.Folder[] = [];
  while(iterator.hasNext())
    folders.push(iterator.next());
  return folders;
}

export const getFiles = (folderId?: string) => {
  const currentFolder = !folderId ? DriveApp.getRootFolder() : DriveApp.getFolderById(folderId);
  const iterator = currentFolder.getFiles();
  const files:GoogleAppsScript.Drive.File[] = [];
  while(iterator.hasNext())
    files.push(iterator.next());
  return files;
}