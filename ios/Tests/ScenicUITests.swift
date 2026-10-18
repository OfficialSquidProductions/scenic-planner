import XCTest

final class ScenicUITests: XCTestCase {
    var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: "org.squidproductions.scenic.ipad")
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.webViews.buttons["Properties"].firstMatch.waitForExistence(timeout: 15))
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
        app.webViews.buttons["Properties"].firstMatch.tap()
        XCTAssertTrue(app.webViews.switches["Add to selection"].waitForExistence(timeout: 3))
        shot("Scenic portrait properties")
        closePanel()
        app.webViews.buttons[phone ? "Scenes and items" : "Scenes"].tap()
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
        XCTAssertTrue(app.webViews.buttons["Properties"].firstMatch.waitForExistence(timeout: 10))
    }
    func testNativeFilesExportAndImportCancel() throws {
        app.webViews.buttons["Save as…"].tap()
        let cancel = app.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Cancel")).firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout: 8), app.debugDescription)
        shot("Scenic native project export")
        cancelFiles()
        let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: cancel)
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 5), .completed)
        let menu = app.webViews.buttons[phone ? "Scenes and items" : "Scenes"]
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
        app.webViews.buttons[phone ? "Scenes and items" : "Scenes"].tap()
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
    func testIPadLandscapePanelsAndPersistence() throws {
        guard !phone else { throw XCTSkip("iPad-specific layout checks") }
        let scenes=app.webViews.buttons["Scenes"],items=app.webViews.buttons["Items"],properties=app.webViews.buttons["Properties"].firstMatch
        let map=app.webViews.otherElements.matching(NSPredicate(format:"label BEGINSWITH %@","Interactive scene map.")).firstMatch
        let mapTab=app.webViews.buttons["Scene map"]
        XCTAssertLessThanOrEqual(scenes.frame.maxX,mapTab.frame.minX)
        XCTAssertLessThan(mapTab.frame.minX-scenes.frame.maxX,24)
        for control in [scenes,items,properties] { XCTAssertTrue(control.isHittable);XCTAssertGreaterThanOrEqual(control.frame.height,44) }
        for _ in 0..<3 { scenes.tap();XCTAssertTrue(app.webViews.buttons["New scene"].isHittable);scenes.tap();XCTAssertFalse(app.webViews.buttons["New scene"].isHittable) }
        for _ in 0..<3 { items.tap();XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable);items.tap();XCTAssertFalse(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable) }
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.waitForExistence(timeout:5))
        XCTAssertTrue(app.webViews.buttons["New scene"].isHittable)
        XCTAssertGreaterThan(map.frame.minX,200)
        shot("iPad landscape Scenes and Items default selected")
        items.tap();XCTAssertFalse(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable)
        shot("iPad landscape Items deselected Scenes selected")
        items.tap()
        app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.tap()
        XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable,"Choosing an item must retain docked library")
        let point=map.coordinate(withNormalizedOffset:CGVector(dx:0.6,dy:0.55));point.tap()
        XCTAssertTrue(app.webViews.buttons["Undo"].isEnabled)
        properties.tap()
        XCTAssertTrue(app.webViews.textFields["Name"].waitForExistence(timeout:5))
        XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable,"Docked item tools remain usable while editing properties")
        shot("iPad landscape selected camera Properties")
        properties.tap()
        app.webViews.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Shot list")).firstMatch.tap()
        XCTAssertTrue(mapTab.isHittable);mapTab.tap()
        app.webViews.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","01 ")).firstMatch.tap()
        let originalTitle=app.webViews.textFields["Scene title"].value as? String
        app.webViews.buttons["New scene"].tap()
        let title=app.webViews.textFields["Scene title"]
        title.typeText("Panel QA scene")
        mapTab.tap()
        XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable)
        shot("iPad landscape new scene")
        let firstScene=app.webViews.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","01 ")).firstMatch
        firstScene.tap()
        XCTAssertEqual(title.value as? String,originalTitle,"Scene switching restores the original scene")
        app.webViews.buttons["Settings"].tap()
        let setting=app.webViews.switches["Keep Scenes and Items on the left in landscape"]
        XCTAssertEqual(setting.value as? String,"1")
        shot("iPad landscape setting enabled by default")
        setting.tap();app.webViews.buttons["Close settings"].tap()
        XCTAssertLessThan(map.frame.minX,10)
        app.terminate();app.launch()
        XCTAssertTrue(items.waitForExistence(timeout:15))
        XCTAssertFalse(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable)
        scenes.tap();app.webViews.buttons["Settings"].tap()
        XCTAssertEqual(setting.value as? String,"0","Off preference persists after process relaunch")
        setting.tap();app.webViews.buttons["Close settings"].tap()
        XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable)
        app.terminate();app.launch()
        XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.waitForExistence(timeout:15))
        shot("iPad landscape enabled preference after relaunch")
        XCUIDevice.shared.orientation = .portrait
        XCTAssertFalse(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable)
        XCTAssertLessThan(map.frame.minX,10)
        items.tap();XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.isHittable)
        shot("iPad portrait Items drawer")
        items.tap()
        XCUIDevice.shared.orientation = .landscapeRight
        XCTAssertTrue(app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Place Camera")).firstMatch.waitForExistence(timeout:5))
        XCTAssertTrue(app.webViews.buttons["New scene"].isHittable)
        app.webViews.buttons["Switch light / dark mode"].tap()
        shot("iPad landscape dark selected states")
        app.webViews.buttons["Switch light / dark mode"].tap()
    }
    func testPhoneKeyboardEditingAndGestures() throws {
        guard phone else { throw XCTSkip("Phone-specific editing checks") }
        app.webViews.buttons[phone ? "Scenes and items" : "Scenes"].tap()
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
        app.webViews.buttons["Properties"].firstMatch.tap()
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
        app.webViews.buttons[phone ? "Scenes and items" : "Scenes"].tap()
        XCTAssertTrue((app.webViews.textFields["Project name"].value as? String)?.contains("Phone")==true)
        app.webViews.buttons["Close scenes and items"].tap()
        shot("Scenic phone touch editing")
    }
    func testZDemoLoadEditAndReload() throws {
        let menu=app.webViews.buttons[phone ? "Scenes and items" : "Scenes"]
        menu.tap()
        let demo=app.webViews.buttons["Load Demo"]
        XCTAssertTrue(demo.waitForExistence(timeout:5));demo.tap()
        let storyScene=app.webViews.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","01 ")).firstMatch
        // Reopening an existing production closes a temporary drawer through normal navigation.
        if !storyScene.waitForExistence(timeout:2) { menu.tap() }
        XCTAssertTrue(storyScene.waitForExistence(timeout:10));storyScene.tap()
        let title=app.webViews.textFields["Scene title"]
        let loaded=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in (title.value as? String)?.contains("BLACK-BOX THEATRE")==true },object:title)
        XCTAssertEqual(XCTWaiter.wait(for:[loaded],timeout:10),.completed)
        if app.webViews.buttons[phone ? "Close scenes and items" : "Close panel"].exists { closePanel() }
        shot("The Last Cue loaded demo map")
        title.tap();title.typeText(" Demo edit")
        app.webViews.buttons["Scene map"].tap()
        menu.tap();demo.tap()
        if app.webViews.buttons[phone ? "Close scenes and items" : "Close panel"].exists { closePanel() }
        XCTAssertTrue((title.value as? String)?.contains("Demo edit")==true,"Load Demo must reopen the existing edited demo")
        shot("The Last Cue editable fictional demo")
        app.webViews.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Shot list")).firstMatch.tap()
        XCTAssertTrue(app.webViews.switches["Coverage checked for shot 1A"].waitForExistence(timeout:5))
        shot("The Last Cue four linked demo shots")
        app.terminate();app.launch()
        XCTAssertTrue(title.waitForExistence(timeout:15));XCTAssertTrue((title.value as? String)?.contains("Demo edit")==true)
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
        XCTAssertTrue(app.webViews.buttons[phone ? "Scenes and items" : "Scenes"].waitForExistence(timeout: 8))
        app.webViews.buttons[phone ? "Scenes and items" : "Scenes"].tap()
        app.webViews.buttons["Import project…"].tap()
        let file = app.collectionViews.cells.containing(NSPredicate(format: "label CONTAINS %@", filename)).firstMatch
        if !file.waitForExistence(timeout: 3) {
            // A fresh simulator opens Recents before Files has indexed its first export.
            let local=app.cells.matching(NSPredicate(format:"label CONTAINS %@","On My")).firstMatch
            if local.exists { local.tap() }
            else if app.buttons["Browse"].exists { app.buttons["Browse"].tap() }
            let folder=app.cells.matching(NSPredicate(format:"label == %@ OR label BEGINSWITH %@","Scenic","Scenic,")).firstMatch
            if folder.waitForExistence(timeout:3) { folder.tap() }
        }
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
