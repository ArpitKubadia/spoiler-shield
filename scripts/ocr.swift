import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count > 1 else {
    print("Usage: ocr <image-path>")
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let url = URL(fileURLWithPath: imagePath)

guard let image = NSImage(contentsOf: url),
      let tiffData = image.tiffRepresentation,
      let imageSource = CGImageSourceCreateWithData(tiffData as CFData, nil),
      let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else {
    print("Failed to load image at \(imagePath)")
    exit(1)
}

let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
let request = VNRecognizeTextRequest { (request, error) in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    for observation in observations {
        guard let candidate = observation.topCandidates(1).first else { continue }
        let boundingBox = observation.boundingBox // normalized coordinates (0..1, y starts at bottom)
        print(String(format: "%.4f,%.4f,%.4f,%.4f:%@", boundingBox.origin.x, boundingBox.origin.y, boundingBox.size.width, boundingBox.size.height, candidate.string))
    }
}

request.recognitionLevel = .accurate
do {
    try requestHandler.perform([request])
} catch {
    print("Failed to perform OCR: \(error)")
    exit(1)
}
