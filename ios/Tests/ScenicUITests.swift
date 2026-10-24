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
    func paletteSource(_ label: String) -> XCUIElement {
        app.webViews.descendants(matching:.any).matching(NSPredicate(format:label == "Floor tile" ? "label BEGINSWITH %@" : "label == %@",label)).firstMatch
    }
    func objectCount() -> Int {
        let value=app.webViews.staticTexts.matching(NSPredicate(format:"label MATCHES %@","[0-9]+ objects")).firstMatch.label
        return Int(value.split(separator:" ").first ?? "") ?? -1
    }
    func expectObjectCount(_ count: Int) {
        let done=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in self.objectCount()==count },object:app)
        XCTAssertEqual(XCTWaiter.wait(for:[done],timeout:5),.completed,"Expected \(count) objects; got \(objectCount())")
    }
    func openItems() {
        let menu=app.webViews.buttons[phone ? "Scenes and items" : "Items"]
        if !app.webViews.searchFields["Search all scene items"].exists { menu.tap() }
        if app.webViews.buttons["Back to Build your scene"].exists { app.webViews.buttons["Back to Build your scene"].tap() }
        if phone && app.webViews.buttons["New scene"].isHittable { app.webViews.buttons["New scene"].swipeUp() }
        XCTAssertTrue(paletteSource("Place Camera").exists)
    }
    func palettePoint(_ label: String) -> XCUICoordinate {
        let source=paletteSource(label),reference=app.webViews.buttons.matching(NSPredicate(format:"label CONTAINS %@","Bring in a reference")).firstMatch
        let tabs=app.webViews.switches["Walls/Floor"]
        let top=max(app.webViews.buttons[phone ? "Scenes and items" : "Items"].frame.maxY+12,tabs.isHittable ? tabs.frame.maxY+8 : 0)
        for _ in 0..<6 {
            let bottom=reference.isHittable ? min(reference.frame.minY-12,app.frame.maxY-35) : app.frame.maxY-35
            if source.frame.minY < bottom-12 && source.frame.maxY > top+12 { break }
            // Scroll inside the library, rather than its fixed heading or outer drawer.
            let from=app.coordinate(withNormalizedOffset:.zero).withOffset(CGVector(dx:source.frame.midX,dy:source.frame.minY>=bottom-12 ? bottom-15 : top+15))
            from.press(forDuration:0.01,thenDragTo:from.withOffset(CGVector(dx:0,dy:source.frame.minY>=bottom-12 ? -150 : 150)))
        }
        let bottom=reference.isHittable ? min(reference.frame.minY-12,app.frame.maxY-35) : app.frame.maxY-35
        let y=max(top+8,min(source.frame.midY,bottom-8))
        XCTAssertGreaterThan(y,source.frame.minY,"Palette source needs a visible drag handle")
        XCTAssertLessThan(y,source.frame.maxY,"Palette source must not be above the visible drawer")
        return app.coordinate(withNormalizedOffset:.zero).withOffset(CGVector(dx:source.frame.midX,dy:y))
    }
    func dragPalette(_ label: String, dx: CGFloat=0.62,dy: CGFloat=0.52) {
        let map=app.webViews.otherElements.matching(NSPredicate(format:"label BEGINSWITH %@","Interactive scene map.")).firstMatch
        palettePoint(label).press(forDuration:0.5,thenDragTo:map.coordinate(withNormalizedOffset:CGVector(dx:dx,dy:dy)))
    }
    func testPaletteTouchDragPortraitAndLandscape() throws {
        app.webViews.buttons["Scene map"].tap()
        for orientation in [UIDeviceOrientation.portrait,.landscapeLeft] {
            XCUIDevice.shared.orientation=orientation
            openItems();let n=objectCount();XCTAssertGreaterThanOrEqual(n,0)
            dragPalette("Place Camera");expectObjectCount(n+1)
            shot(phone ? "iPhone palette camera drop \(orientation.rawValue)" : "iPad palette camera drop \(orientation.rawValue)")
            if phone { app.webViews.switches["Select (V)"].swipeLeft() }
            app.webViews.buttons["Undo"].tap();expectObjectCount(n)
            app.webViews.buttons["Redo"].tap();expectObjectCount(n+1)
            openItems()
            paletteSource("Place Talent").coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.5)).press(forDuration:0.5,thenDragTo:app.webViews.buttons["Share"].coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.5)))
            expectObjectCount(n+1)
            XCTAssertTrue(paletteSource("Place Camera").isHittable,"Cancelled drag restores the Items panel")
            app.webViews.buttons["Open Lights library"].tap()
            XCTAssertTrue(app.webViews.buttons["Back to Build your scene"].exists,"Category navigation keeps the palette available")

            dragPalette("Place LED panel",dx:0.7,dy:0.63);expectObjectCount(n+2)
            shot(phone ? "iPhone light dragged onto scene \(orientation.rawValue)" : "iPad light dragged onto scene \(orientation.rawValue)")
            app.webViews.buttons["Properties"].firstMatch.tap()
            XCTAssertTrue(app.webViews.textFields["Name"].waitForExistence(timeout:5))
            shot(phone ? "iPhone dropped light properties" : "iPad dropped light properties")
            closePanelIfTemporary()
            app.terminate();app.launch()
            XCTAssertTrue(app.webViews.buttons["Properties"].firstMatch.waitForExistence(timeout:15));expectObjectCount(n+2)
        }
    }
    func closePanelIfTemporary() {
        if app.webViews.buttons["Close scenes and items"].isHittable || app.webViews.buttons["Close properties"].isHittable || app.webViews.buttons["Close panel"].isHittable { closePanel() }
        else if app.webViews.buttons["Properties"].firstMatch.value as? String == "1" { app.webViews.buttons["Properties"].firstMatch.tap() }
    }
    func testPaletteCategoriesAndScrolling() throws {
        app.webViews.buttons["Scene map"].tap();openItems()
        app.webViews.buttons["Open Props library"].tap()
        let n=objectCount()
        let scrollStart=palettePoint("Place Laptop")
        scrollStart.press(forDuration:0.01,thenDragTo:scrollStart.withOffset(CGVector(dx:0,dy:-100)));expectObjectCount(n)
        shot(phone ? "iPhone palette native scrolling" : "iPad palette native scrolling")
        let search=app.webViews.searchFields["Search all scene items"]
        search.tap();search.typeText("Mug")
        let menu=app.webViews.buttons[phone ? "Scenes and items" : "Items"]
        menu.tap();menu.tap() // Hide the search keyboard and reopen its results.
        XCTAssertTrue(paletteSource("Place Mug").isHittable)
        shot(phone ? "iPhone searched Mug source" : "iPad searched Mug source")
        dragPalette("Place Mug");expectObjectCount(n+1)
        openItems();app.webViews.buttons["Open Walls/Floor library"].tap()
        let room=app.webViews.descendants(matching:.any).matching(NSPredicate(format:"label BEGINSWITH %@","Place Square room")).firstMatch
        XCTAssertTrue(room.isHittable,app.debugDescription)
        let map=app.webViews.otherElements.matching(NSPredicate(format:"label BEGINSWITH %@","Interactive scene map.")).firstMatch
        palettePoint("Place Square room").press(forDuration:0.5,thenDragTo:map.coordinate(withNormalizedOffset:CGVector(dx:0.72,dy:0.65)))
        expectObjectCount(n+2)
        openItems();app.webViews.buttons["Open Set library"].tap()
        dragPalette("Place Car",dx:0.45,dy:0.4);expectObjectCount(n+3)
        shot(phone ? "iPhone dragged props room and set" : "iPad dragged props room and set")
    }
    func testPaletteLandscapeOverlayAndStraightWall() throws {
        guard !phone else { throw XCTSkip("iPad landscape overlay preference") }
        XCUIDevice.shared.orientation = .landscapeLeft
        if !app.webViews.buttons["Settings"].isHittable { app.webViews.buttons["Scenes"].tap() }
        app.webViews.buttons["Settings"].tap()
        let preference=app.webViews.switches["Keep Scenes and Items on the left in landscape"]
        if preference.value as? String == "1" { preference.tap() }
        app.webViews.buttons["Close settings"].tap()
        let map=app.webViews.otherElements.matching(NSPredicate(format:"label BEGINSWITH %@","Interactive scene map.")).firstMatch
        XCTAssertLessThan(map.frame.minX,10)
        let n=objectCount()
        for i in 1...2 { openItems();dragPalette("Place Camera",dx:0.55,dy:0.4);expectObjectCount(n+i) }
        openItems();app.webViews.buttons["Open Walls/Floor library"].tap()
        let wall=app.webViews.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Draw a straight wall")).firstMatch
        XCTAssertTrue(wall.isHittable)
        wall.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.5)).press(forDuration:0.5,thenDragTo:map.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.5)))
        expectObjectCount(n+2)
        map.coordinate(withNormalizedOffset:CGVector(dx:0.65,dy:0.6)).tap();expectObjectCount(n+3)
        shot("iPad landscape overlay drag and completed straight wall")
        app.webViews.switches["Select (V)"].tap()
        app.webViews.buttons["Scenes"].tap();app.webViews.buttons["Settings"].tap()
        preference.tap();app.webViews.buttons["Close settings"].tap()
        XCTAssertGreaterThan(map.frame.minX,200)
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
    func testShotListCSVToolbarFilesAndRotation() throws {
        for orientation in [UIDeviceOrientation.portrait,.landscapeLeft] {
            XCUIDevice.shared.orientation=orientation
            app.webViews.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Shot list")).firstMatch.tap()
            let importCSV=app.webViews.buttons["Import shot list CSV"]
            let exportCSV=app.webViews.buttons["Export Shot List CSV"]
            XCTAssertTrue(importCSV.waitForExistence(timeout:5))
            XCTAssertEqual(app.webViews.buttons.matching(identifier:"Import shot list CSV").count,1)
            XCTAssertEqual(app.webViews.buttons.matching(identifier:"Export Shot List CSV").count,1)
            for action in [importCSV,exportCSV] {
                XCTAssertTrue(action.isHittable,"CSV action must stay reachable after rotation")
                XCTAssertGreaterThanOrEqual(action.frame.height,44)
                XCTAssertGreaterThanOrEqual(action.frame.minX,app.frame.minX)
                XCTAssertLessThanOrEqual(action.frame.maxX,app.frame.maxX)
            }
            shot(phone ? "iPhone Shot List paired CSV toolbar \(orientation.rawValue)" : "iPad Shot List paired CSV toolbar \(orientation.rawValue)")
            importCSV.tap()
            let cancel=app.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Cancel")).firstMatch
            XCTAssertTrue(cancel.waitForExistence(timeout:8),app.debugDescription)
            shot(phone ? "iPhone toolbar native CSV import" : "iPad toolbar native CSV import")
            cancelFiles()
            let back=XCTNSPredicateExpectation(predicate:NSPredicate(format:"hittable == true"),object:exportCSV)
            XCTAssertEqual(XCTWaiter.wait(for:[back],timeout:8),.completed)
            exportCSV.tap()
            XCTAssertTrue(cancel.waitForExistence(timeout:8),app.debugDescription)
            shot(phone ? "iPhone toolbar native CSV export" : "iPad toolbar native CSV export")
            cancelFiles()
            let returned=XCTNSPredicateExpectation(predicate:NSPredicate(format:"hittable == true"),object:importCSV)
            XCTAssertEqual(XCTWaiter.wait(for:[returned],timeout:8),.completed)
        }
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
    func testFloorTileControlsAndImagePickerCancel() throws {
        app.webViews.buttons["Scene map"].tap();openItems()
        app.webViews.buttons["Open Walls/Floor library"].tap()
        palettePoint("Floor tile").tap()
        let map=app.webViews.otherElements.matching(NSPredicate(format:"label BEGINSWITH %@","Interactive scene map.")).firstMatch
        let n=objectCount();map.coordinate(withNormalizedOffset:CGVector(dx:0.62,dy:0.55)).tap();expectObjectCount(n+1)
        app.webViews.buttons["Properties"].firstMatch.tap()
        XCTAssertTrue(app.webViews.buttons["Upload image"].waitForExistence(timeout:5))
        for (label,value) in [("Width","18 ft"),("Height","6 ft")] {
            let field=app.webViews.textFields[label]
            field.coordinate(withNormalizedOffset:CGVector(dx:0.97,dy:0.5)).tap()
            field.typeText(String(repeating:XCUIKeyboardKey.delete.rawValue,count:20)+value+"\n")
        }
        XCTAssertTrue((app.webViews.textFields["Width"].value as? String)?.contains("18")==true)
        XCTAssertTrue((app.webViews.textFields["Height"].value as? String)?.contains("6")==true)
        shot("Floor independent dimensions and color controls")
        app.webViews.buttons["Upload image"].tap()
        shot("Floor native image picker")
        let choose=app.buttons["Choose File"]
        if choose.waitForExistence(timeout:3) { choose.tap() }
        let cancel=app.buttons["Cancel"].firstMatch
        if cancel.waitForExistence(timeout:5) { cancel.tap() }
        else { cancelFiles() }
        XCTAssertTrue(app.webViews.buttons["Upload image"].waitForExistence(timeout:5))
        shot("Floor image picker cancellation preserves editable floor")
    }
    func testNoBundledDemoEntryPoints() throws {
        app.webViews.buttons[phone ? "Scenes and items" : "Scenes"].tap()
        XCTAssertFalse(app.webViews.buttons["Load The Last Light demo"].exists)
        XCTAssertFalse(app.webViews.buttons["Demo guide / reset"].exists)
        shot("No bundled demo entry points")
        if app.webViews.buttons[phone ? "Close scenes and items" : "Close panel"].exists { closePanel() }
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
