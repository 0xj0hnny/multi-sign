export const PdfViewer = ({ pdfUrl }: { pdfUrl: string }) => {
  return (
    <>
      <iframe
        src={pdfUrl}
        className="w-full h-[600px]"
        title="PDF Preview"
      />
    </>
  );
};