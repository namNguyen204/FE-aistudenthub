const titleCollator = new Intl.Collator('vi', {
  sensitivity: 'base',
  numeric: true
});

const getDocumentTitle = (document) =>
  String(document?.title || document?.name || document?.fileName || '').trim();

const getDocumentTimestamp = (document) => {
  const rawDate = document?.createdAt
    || document?.uploadedAt
    || document?.createdDate
    || document?.updatedAt;
  const timestamp = rawDate ? new Date(rawDate).getTime() : Number.NaN;

  return Number.isFinite(timestamp) ? timestamp : null;
};

export const sortDocuments = (documents, sortOption) => {
  const sortedDocuments = [...documents];
  const direction = sortOption?.endsWith(',asc') ? 1 : -1;

  sortedDocuments.sort((firstDocument, secondDocument) => {
    if (sortOption?.startsWith('title,')) {
      const firstTitle = getDocumentTitle(firstDocument);
      const secondTitle = getDocumentTitle(secondDocument);

      if (!firstTitle && !secondTitle) return 0;
      if (!firstTitle) return 1;
      if (!secondTitle) return -1;

      return titleCollator.compare(firstTitle, secondTitle) * direction;
    }

    const firstTimestamp = getDocumentTimestamp(firstDocument);
    const secondTimestamp = getDocumentTimestamp(secondDocument);

    if (firstTimestamp === null && secondTimestamp === null) return 0;
    if (firstTimestamp === null) return 1;
    if (secondTimestamp === null) return -1;

    return (firstTimestamp - secondTimestamp) * direction;
  });

  return sortedDocuments;
};
