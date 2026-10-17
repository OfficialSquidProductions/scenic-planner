import XCTest

final class ScenicUITests: XCTestCase {
    var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: "org.squidproductions.scenic.ipad")
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.webViews.buttons["Properties"].waitForExistence(timeout: 15))
    }
    var phone: Bool { min(app.frame.width,app.frame.height) < 600 }
    func closePanel() {
        if phone {
            if app.webViews.buttons["Close scenes and items"].exists { app.webViews.buttons["Close scenes and items"].tap() }
            else { app.webViews.buttons["Close properties"].tap() }
        } else { app.webViews.buttons["Close panel"].tap() }
    }
    func cancelFiles() {
        if phone {
            let bar=app.navigationBars["FullDocumentManagerViewControllerNavigationBar"]
            XCTAssertTrue(bar.waitForExistence(timeout:8),app.debugDescription)
            bar.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.1)).press(forDuration:0.05,thenDragTo:app.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.96)))
        } else { app.buttons["Cancel"].firstMatch.tap() }
    }
    func shot(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); attachment.name = name
        attachment.lifetime = .keepAlways; add(attachment)
    }
    func testPortraitLandscapeAndDrawers() throws {
        for label in ["Save as…","Share"] {
            let frame = app.webViews.buttons[label].frame
            XCTAssertGreaterThanOrEqual(frame.width, 44)
            XCTAssertGreaterThanOrEqual(frame.minX, 0)
            XCTAssertLessThanOrEqual(frame.maxX, app.frame.width)
        }
        shot("Scenic portrait")
        app.webViews.buttons["Properties"].tap()
        XCTAssertTrue(app.webViews.switches["Add to selection"].waitForExistence(timeout: 3))
        shot("Scenic portrait properties")
        closePanel()
        app.webViews.buttons["Scenes and items"].tap()
        XCTAssertTrue(app.webViews.buttons["Import project…"].waitForExistence(timeout: 3))
        shot("Scenic portrait library")
        closePanel()
        XCUIDevice.shared.orientation = .landscapeLeft
        let landscape = XCTNSPredicateExpectation(predicate: NSPredicate { _,_ in self.app.frame.width > self.app.frame.height }, object: app)
        XCTAssertEqual(XCTWaiter.wait(for: [landscape], timeout: 5), .completed)
        XCTAssertTrue(app.webViews.buttons["Save as…"].waitForExistence(timeout: 3))
        if !phone { app.webViews.buttons["Switch light / dark mode"].tap(); app.webViews.buttons["Switch light / dark mode"].tap() }
        shot("Scenic landscape")
        app.terminate(); app.launch()
        XCTAssertTrue(app.webViews.buttons["Properties"].waitForExistence(timeout: 10))
    }
    func testNativeFilesExportAndImportCancel() throws {
        app.webViews.buttons["Save as…"].tap()
        let cancel = app.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Cancel")).firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 8), app.debugDescription)
        shot("Scenic native project export")
        cancelFiles()
        let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: cancel)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 5), .completed)
        let menu = app.webViews.buttons["Scenes and items"]
        let hittable = XCTNSPredicateExpectation(predicate: NSPredicate(format: "hittable == true"), object: menu)
        XCTAssertEqual(XCTWaiter.wait(for: [hittable], timeout: 5), .completed)
        menu.tap()
        if !app.webViews.buttons["Import project…"].waitForExistence(timeout: 2) { menu.tap() }
        XCTAssertTrue(app.webViews.buttons["Import project…"].waitForExistence(timeout: 3))
        app.webViews.buttons["Import project…"].tap()
        XCTAssertTrue(cancel.waitForExistence(timeout: 8), app.debugDescription)
        shot("Scenic native project import")
        cancelFiles()
        XCTAssertTrue(app.webViews.buttons[phone ? "Close scenes and items" : "Close panel"].waitForExistence(timeout: 5))
        closePanel()
        app.webViews.buttons["Scenes and items"].tap()
        app.webViews.buttons["Browse all scenes"].tap()
        XCTAssertTrue(app.navigationBars.buttons["Done"].waitForExistence(timeout: 5), app.debugDescription)
        shot("Scenic scene browser")
        app.navigationBars.buttons["Done"].tap()
    }
    func testNativeShareCancel() throws {
        app.webViews.buttons["Share"].tap()
        let popover = app.popovers.firstMatch
        XCTAssertTrue(popover.waitForExistence(timeout: 8), app.debugDescription)
        XCTAssertTrue(app.collectionViews.cells["Save to Files"].waitForExistence(timeout: 8), app.debugDescription)
        shot(phone ? "Scenic iPhone native share" : "Scenic native project share")
        app.otherElements["PopoverDismissRegion"].tap()
        let save = app.webViews.buttons["Save as…"]
        let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "hittable == true"), object: save)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 5), .completed)
        save.tap()
        XCTAssertTrue(app.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Cancel")).firstMatch.waitForExistence(timeout: 8))
        cancelFiles()
    }
    func testPhoneKeyboardEditingAndGestures() throws {
        guard phone else { throw XCTSkip("Phone-specific editing checks") }
        app.webViews.buttons["Scenes and items"].tap()
        let projectName=app.webViews.textFields["Project name"]
        XCTAssertTrue(projectName.waitForExistence(timeout: 5))
        projectName.coordinate(withNormalizedOffset: CGVector(dx:0.97,dy:0.5)).tap()
        projectName.typeText(" Phone")
        if app.buttons["Continue"].exists { app.buttons["Continue"].tap() }
        app.webViews.buttons["Close scenes and items"].tap()
        let camera=app.webViews.switches["Camera (C)"]
        camera.tap()
        let map=app.webViews.otherElements.matching(NSPredicate(format:"label BEGINSWITH %@","Interactive scene map.")).firstMatch
        let start=map.coordinate(withNormalizedOffset:CGVector(dx:0.45,dy:0.4))
        start.tap()
        start.press(forDuration:0.1,thenDragTo:map.coordinate(withNormalizedOffset:CGVector(dx:0.55,dy:0.45)))
        app.webViews.buttons["Properties"].tap()
        let name=app.webViews.textFields["Name"]
        XCTAssertTrue(name.waitForExistence(timeout:5),app.debugDescription)
        name.coordinate(withNormalizedOffset:CGVector(dx:0.97,dy:0.5)).tap()
        name.typeText(" Phone camera")
        if app.buttons["Continue"].exists { app.buttons["Continue"].tap() }
        XCTAssertTrue(app.webViews.buttons["Close properties"].isHittable,app.debugDescription)
        shot("Scenic phone keyboard properties")
        app.webViews.buttons["Close properties"].tap()
        map.pinch(withScale:1.3,velocity:1)
        let pan=app.webViews.switches["Pan (Space)"]
        pan.tap()
        map.coordinate(withNormalizedOffset:CGVector(dx:0.45,dy:0.6)).press(forDuration:0.1,thenDragTo:map.coordinate(withNormalizedOffset:CGVector(dx:0.55,dy:0.65)))
        app.webViews.buttons["Scenes and items"].tap()
        XCTAssertTrue((app.webViews.textFields["Project name"].value as? String)?.contains("Phone")==true)
        app.webViews.buttons["Close scenes and items"].tap()
        shot("Scenic phone touch editing")
    }
    func testRealTouchCanvasAndBackupRoundTrip() throws {
        // Keep the existing synthetic production: this suite only runs in its dedicated simulator.
        if phone { app.webViews.buttons["Scenes and items"].tap() }
        let originalName=app.webViews.textFields["Project name"].value as! String
        let filename=String(originalName.replacingOccurrences(of:"[^a-zA-Z0-9_-]",with:"_",options:.regularExpression).prefix(100))
        if phone { closePanel() }
        app.webViews.buttons["Save as…"].tap()
        let save = app.buttons["Save"].firstMatch
        XCTAssertTrue(save.waitForExistence(timeout: 8), app.debugDescription)
        save.tap()
        if app.alerts.buttons["Replace"].waitForExistence(timeout: 2) { app.alerts.buttons["Replace"].tap() }
        XCTAssertTrue(app.webViews.buttons["Scenes and items"].waitForExistence(timeout: 8))
        app.webViews.buttons["Scenes and items"].tap()
        app.webViews.buttons["Import project…"].tap()
        let file = app.collectionViews.cells.containing(NSPredicate(format: "label CONTAINS %@", filename)).firstMatch
        XCTAssertTrue(file.waitForExistence(timeout: 8), app.debugDescription)
        shot("Scenic saved project in Files")
        file.tap()
        XCTAssertTrue(app.webViews.buttons["Save as…"].waitForExistence(timeout: 8))
        let imported=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in
            guard let name=self.app.webViews.textFields["Project name"].value as? String else { return false }
            return name != originalName && name.hasPrefix(originalName)
        },object:app)
        XCTAssertEqual(XCTWaiter.wait(for:[imported],timeout:8),.completed,"Files import must activate a distinct editable production")
        if app.webViews.buttons["Close panel"].exists || app.webViews.buttons["Close scenes and items"].exists { closePanel() }
        let camera=app.webViews.switches["Camera (C)"]
        if !camera.isHittable { app.webViews.switches["Select (V)"].swipeLeft() }
        camera.tap()
        let map = app.webViews.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Interactive scene map.")).firstMatch
        XCTAssertTrue(map.exists)
        let start = map.coordinate(withNormalizedOffset: CGVector(dx: 0.5,dy: 0.45))
        start.tap()
        let end = map.coordinate(withNormalizedOffset: CGVector(dx: 0.58,dy: 0.49))
        start.press(forDuration: 0.1, thenDragTo: end)
        XCTAssertTrue(app.webViews.buttons["Undo"].isEnabled)
        shot("Scenic real touch placement and drag")
    }
}
