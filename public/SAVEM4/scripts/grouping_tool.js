
var util = require('util'),
    sax = require("sax"),
    strict = true, // set to false for html-mode
    parser = sax.parser(strict),
    groupingObj = { },
    currentObj = undefined,
    indentLevel = 0,
    indentSize = 2,
    endOfArray = [ ],
    parseOnEnd = function(data) { };

parser.onerror = function(e) { /* an error happened. */ };
parser.ontext = function(t) { /* got some text.  t is the string of text. */ };
parser.onclosetag = function(name) { // closing a tag.  name is the name from onopentag node.name
    if (name == 'group') {
        var p = currentObj.parent;
        delete currentObj.parent;
        currentObj = p;
    }
};
parser.onopentag = function(node) { // opened a tag.  node has "name" and "attributes", isSelfClosing
    switch (node.name) {
    case 'grouping':
        groupingObj[ node.name ] = node.attributes.name;
        currentObj = groupingObj;
        break;
    case 'group':
        var g = { 'name': node.attributes.name, 'node': node.attributes.node };

        currentObj.groups = currentObj.groups || [ ];
        currentObj.groups.push(g);
        g.parent = currentObj;
        currentObj = currentObj.groups[ currentObj.groups.length - 1 ];
        break;
    case 'part':
        currentObj.parts = currentObj.parts || [ ];
        currentObj.parts.push(node.attributes.node);
        break;
    }
};
parser.onattribute = function(attr) { /* an attribute.  attr has "name" and "value" */ };
parser.onend = function() { // parser stream is done, and ready to have more stuff written to it.
    parseOnEnd(groupingObj);
};

function getIndentString() {
    var indentString = '';
    var numSpaces = indentLevel * indentSize;

    while (numSpaces--) indentString += ' ';
    return indentString;
}

function prettyPrintObj(obj) {
    if (typeof(obj) == 'string') {
        util.puts(getIndentString() + '"' + obj + '"' + (endOfArray.pop()? '' : ','));
        return;
    }

    util.puts(getIndentString() +  '{');
    indentLevel++;

    var keys = Object.keys(obj);
    var lastpOfObj = keys[ keys.length - 1 ];

    for (var p in obj) {
        if (Object.prototype.toString.call(obj[ p ]) == '[object Array]') { // key => [ ... ]
            util.puts(getIndentString() +  '"' + p + '": [');
            indentLevel++;

            var o = obj[ p ], l = o.length, s = l - 1; // o => object, l => length of array, s => last index

            for (var i = 0; i < l; i++) {
                endOfArray.push(i  == s);
                prettyPrintObj(o[ i ]);
            }

            indentLevel--;
            util.puts(getIndentString() +  ']' + (p == lastpOfObj? '' : ','));
        } else if (Object.prototype.toString.call(obj[ p ]) == '[object Object]') { // key => { ... }
            util.puts(getIndentString() +  '"' + p + '":');
            endOfArray.push(p == lastpOfObj);
            prettyPrintObj(obj[ p ]);
        } else { // key => value
            util.puts(getIndentString() +  '"' + p + '": "' + obj[ p ] + (p == lastpOfObj? '"' : '",'));
        }
    }

    indentLevel--;
    util.puts(getIndentString() +  '}' + (endOfArray.length && !endOfArray.pop()? ',' : ''));
}

var xml = '<grouping name="M4 Carbine">\
    <part node="Bling"/>\
    <group node="M4" name="M4 Group">\
        <group name="B Group">\
            <part node="A"/>\
            <part node="B"/>\
            <group name="B_N Group">\
                <part node="B_N"/>\
            </group>\
        </group>\
        <group name="Mag Group">\
            <part node="C1"/>\
        </group>\
        <part node="Sling"/>\
    </group>\
</grouping>';

parser.write(xml).close();
prettyPrintObj(groupingObj);

var transformGroupingToNode3 = function(obj, node3) {
    for (var p in obj) {
        if (p == 'groups') {
            obj.groups.forEach(function(group) {
                var children = node3;

                if (group.node) {
                    node3.children[ group.node ] = { extends: "http://vwf.example.com/node3.vwf", children: { } };
                    children = node3.children[ group.node ];
                }

                transformGroupingToNode3(group, children);
            });
        } else if (p == 'parts') {
            obj.parts.forEach(function(part) {
                node3.children[ part ] = { extends: "http://vwf.example.com/node3.vwf" };
            });
        }
    }

    return node3;
};
var n3 = transformGroupingToNode3(groupingObj, {
    grouping: groupingObj.grouping,
    extends: "http://vwf.example.com/node3.vwf",
    type: "model/vnd.collada+xml",
    implements: [ ],
    properties: { },
    children: { }
});

// util.puts('');
// util.puts(JSON.stringify(n3));
util.puts('');
prettyPrintObj(n3);

/*
<grouping name="M4 Carbine">
    <part node="Buttstock"/>
    <part node="Swivel_LAMA1259863095"/>
    <part node="Machine_Screw"/>
    <part node="Buttstock_Release_Lever_Nut"/>
    <part node="Buttstock_Release_Lever_Screw_LAMA1417807796"/>
    <part node="Buttstock_Release_Lever_Spring_Pin"/>
    <part node="Buttstock_Release_Lever_Spring"/>
    <part node="Buttstock_Release_Lever"/>
    <part node="Tube"/>
    <part node="Clip_Spring1"/>
    <part node="Base"/>
    <part node="Clip_Spring"/>
    <part node="Follower"/>
    <part node="Casing1"/>
    <part node="Projectile1"/>
    <part node="Casing2"/>
    <part node="Projectile2"/>
    <part node="Casing3"/>
    <part node="Projectile3"/>
    <part node="Barrel_Assembly"/>
    <part node="Upper_Handguard"/>
    <part node="Lower_Handguard"/>
    <part node="Small_Sling_Swivel"/>
    <part node="Front_Sight_Post"/>
    <part node="Headless_Shoulder_Pin"/>
    <part node="Spring3"/>
    <part node="Tubular_Rivet"/>
    <part node="Synchro_Clamp"/>
    <part node="Spring_Pin1"/>
    <part node="Spring_Pin"/>
    <part node="Swivel_Mount"/>
    <part node="Flat_Spring"/>
    <part node="Special_Shaped_Spacer"/>
    <part node="Compensator"/>
    <part node="Recessed_Washer__OOCompensator"/>
    <part node="Spring_Pin2"/>
    <part node="Spring_Pin3"/>
    <part node="Rear_Handguard_Clamp"/>
    <part node="Screw"/>
    <part node="Gas_Tube_Spring_Pin"/>
    <part node="Gas_Tube"/>
    <part node="Handguard_Slip_Ring_Spring"/>
    <part node="Handguard_Slip_Ring_Retaining_Ring"/>
    <part node="Handguard_Slip_Ring_LAMA918813252"/>
    <part node="Sling"/>
    <part node="Lower_Receiver"/>
    <part node="Trigger_Guard"/>
    <part node="Trigger_Guard_Spring_Pin_Retaining_Pin"/>
    <part node="Trigger_Guard_Detent"/>
    <part node="Trigger_Guard_Detent_Spring"/>
    <part node="Pistol_Grip"/>
    <part node="Pistol_Grip_Screw"/>
    <part node="Pistol_Grip_Lock_Washer"/>
    <part node="Bolt_Catch"/>
    <part node="Bolt_Catch_Spring_Pin"/>
    <part node="Bolt_Catch_Plunger"/>
    <part node="Bolt_Catch_Spring"/>
    <part node="Trigger"/>
    <part node="Trigger_Spring"/>
    <part node="Disconnector_Spring__OOBurst__CC"/>
    <part node="Disconnector_Spring__OOSemi__CC"/>
    <part node="Trigger_Spring1"/>
    <part node="Trigger_Pin"/>
    <part node="Disconnector__Burst"/>
    <part node="Disconnector__Semi"/>
    <part node="Magazine_Catch"/>
    <part node="Magazine_Catch_Spring"/>
    <part node="Magazine_Catch_Button"/>
    <part node="Pivot_Pin"/>
    <part node="Pivot_Pin_Detent"/>
    <part node="Pivot_Pin_Spring"/>
    <part node="Takedown_Pin"/>
    <part node="Takedown_Pin_Detent"/>
    <part node="Takedown_Pin_Detent_Spring"/>
    <part node="Selector_Lever"/>
    <part node="Safety_Detent__OOSelector_Lever__CC"/>
    <part node="Safety_Spring__OOSelector_Lever__CC"/>
    <part node="Automatic_Sear"/>
    <part node="Automatic_Sear_Spring"/>
    <part node="Sear_Pin"/>
    <part node="Hammer"/>
    <part node="Hammer_Spring1"/>
    <part node="Hammer_Pin"/>
    <part node="Burst_Cam"/>
    <part node="Burst_Cam_Clutch_Spring"/>
    <part node="Hammer_Spring"/>
    <part node="Lower_Receiver_Extension"/>
    <part node="Buffer"/>
    <part node="Action_Spring"/>
    <part node="Plain_Round_Nut"/>
    <part node="Receiver_End_Plate"/>
    <part node="Buffer_Retainer"/>
    <part node="Buffer_Retainer_Spring"/>
    <part node="Upper_Receiver"/>
    <part node="Charging_Handle"/>
    <part node="Charging_Handle_Latch"/>
    <part node="Charging_Handle_Spring"/>
    <part node="Charging_Handle_Spring_Pin"/>
    <part node="Key_and_Bolt_Carrier_Assembly"/>
    <part node="Firing_Pin_Retaining_Pin"/>
    <part node="Firing_Pin"/>
    <part node="Bolt"/>
    <part node="Bolt_Cam_Pin"/>
    <part node="Ejector_Spring_Pin"/>
    <part node="Bolt_Ring"/>
    <part node="Bolt_Ring2"/>
    <part node="Bolt_Ring1"/>
    <part node="Ejector"/>
    <part node="Ejector_Spring"/>
    <part node="Extractor"/>
    <part node="Extractor_Spring"/>
    <part node="Extractor_Pin"/>
    <part node="Casing4"/>
    <part node="Projectile4"/>
    <part node="Plunger_Assembly"/>
    <part node="Pawl__Forward_Assist"/>
    <part node="Forward_Assist_Spring"/>
    <part node="Forward_Assist_Spring1"/>
    <part node="Pawl_Spring_Pin"/>
    <part node="Pawl_Detent"/>
    <part node="Pawl_Spring"/>
    <part node="Cover_Pin"/>
    <part node="Ejection_Port_Cover"/>
    <part node="Cover_Spring"/>
    <part node="Cover_Retaining_Ring__OOC_Clip__CC"/>
    <part node="Gun_Carrying_Handle"/>
    <part node="Windage_Spring_Pin"/>
    <part node="Rear_Sight_Screw"/>
    <part node="Flat_Rear_Sight_Spring"/>
    <part node="Rear_Sight_Base"/>
    <part node="Sight_Aperture"/>
    <part node="Windage_Knob"/>
    <part node="Spring__Helical__Compression"/>
    <part node="Knob"/>
    <part node="Ball_Bearing1"/>
    <part node="Elevating_Mechanism"/>
    <part node="Spring2"/>
    <part node="Spring1"/>
    <part node="Index_Screw"/>
    <part node="Ball_Bearing"/>
    <part node="Pin_Spring"/>
    <part node="Spring"/>
    <part node="Ball_Bearing2"/>
    <part node="Round_Nut1"/>
    <part node="Washer1"/>
    <part node="Washer"/>
    <part node="Clamping_Bar"/>
    <part node="Round_Nut"/>
</grouping>
*/

/*
<grouping>
    <group name="M4 Group">
        <part node="Sling"/>
        <group name="Buttstock Group">
            <part node="Buttstock"/>
            <group name="Swivel_LAMA1259863095 Group">
                <part node="Swivel_LAMA1259863095"/>
                <part node="Machine_Screw"/>
            </group>
            <group name="Buttstock_Release_Lever_Nut Group">
                <part node="Buttstock_Release_Lever_Nut"/>
                <part node="Buttstock_Release_Lever"/>
                <group name="Buttstock_Release_Lever_Screw_LAMA1417807796 Group">
                    <part node="Buttstock_Release_Lever_Screw_LAMA1417807796"/>
                    <part node="Buttstock_Release_Lever_Spring_Pin"/>
                    <part node="Buttstock_Release_Lever_Spring"/>
                </group>
            </group>
        </group>
        <group name="Magazine_g Group">
            <group name="Tube Group">
                <part node="Tube"/>
                <part node="Clip_Spring1"/>
                <part node="Base"/>
                <part node="Clip_Spring"/>
                <part node="Follower"/>
                <group name="Casing1 Group">
                    <part node="Casing1"/>
                    <part node="Projectile1"/>
                </group>
                <group name="Casing2 Group">
                    <part node="Casing2"/>
                    <part node="Projectile2"/>
                </group>
                <group name="Casing3 Group">
                    <part node="Casing3"/>
                    <part node="Projectile3"/>
                </group>
            </group>
        </group>
        <group name="Barrel_Assembly Group">
            <part node="Barrel_Assembly"/>
            <part node="Upper_Handguard"/>
            <part node="Lower_Handguard"/>
            <part node="Small_Sling_Swivel"/>
            <part node="Compensator"/>
            <part node="Recessed_Washer__OOCompensator"/>
            <part node="Spring_Pin2"/>
            <part node="Spring_Pin3"/>
            <part node="Rear_Handguard_Clamp"/>
            <part node="Screw"/>
            <part node="Gas_Tube_Spring_Pin"/>
            <part node="Gas_Tube"/>
            <part node="Handguard_Slip_Ring_Spring"/>
            <part node="Handguard_Slip_Ring_Retaining_Ring"/>
            <part node="Handguard_Slip_Ring_LAMA918813252"/>
            <group name="Front_Sight_Post Group">
                <part node="Front_Sight_Post"/>
                <part node="Headless_Shoulder_Pin"/>
                <part node="Spring3"/>
                <part node="Tubular_Rivet"/>
                <part node="Synchro_Clamp"/>
                <part node="Spring_Pin1"/>
                <part node="Spring_Pin"/>
                <part node="Swivel_Mount"/>
                <part node="Flat_Spring"/>
                <part node="Special_Shaped_Spacer"/>
            </group>
        </group>
        <group name="Lower_Receiver Group">
            <part node="Lower_Receiver"/>
            <part node="Bolt_Catch"/>
            <part node="Bolt_Catch_Spring_Pin"/>
            <part node="Bolt_Catch_Plunger"/>
            <part node="Bolt_Catch_Spring"/>
            <part node="Trigger"/>
            <part node="Trigger_Spring"/>
            <part node="Disconnector_Spring__OOBurst__CC"/>
            <part node="Disconnector_Spring__OOSemi__CC"/>
            <part node="Trigger_Spring1"/>
            <part node="Trigger_Pin"/>
            <part node="Disconnector__Burst"/>
            <part node="Disconnector__Semi"/>
            <part node="Magazine_Catch"/>
            <part node="Magazine_Catch_Spring"/>
            <part node="Magazine_Catch_Button"/>
            <part node="Pivot_Pin"/>
            <part node="Pivot_Pin_Detent"/>
            <part node="Pivot_Pin_Spring"/>
            <part node="Takedown_Pin"/>
            <part node="Takedown_Pin_Detent"/>
            <part node="Takedown_Pin_Detent_Spring"/>
            <part node="Selector_Lever"/>
            <part node="Safety_Detent__OOSelector_Lever__CC"/>
            <part node="Safety_Spring__OOSelector_Lever__CC"/>
            <part node="Automatic_Sear"/>
            <part node="Automatic_Sear_Spring"/>
            <part node="Sear_Pin"/>
            <part node="Hammer"/>
            <part node="Hammer_Spring1"/>
            <part node="Hammer_Pin"/>
            <part node="Burst_Cam"/>
            <part node="Burst_Cam_Clutch_Spring"/>
            <part node="Hammer_Spring"/>
            <part node="Lower_Receiver_Extension"/>
            <part node="Buffer"/>
            <part node="Action_Spring"/>
            <part node="Plain_Round_Nut"/>
            <part node="Receiver_End_Plate"/>
            <part node="Buffer_Retainer"/>
            <part node="Buffer_Retainer_Spring"/>
            <group name="Trigger_Guard Group">
                <part node="Trigger_Guard"/>
                <part node="Trigger_Guard_Spring_Pin_Retaining_Pin"/>
                <part node="Trigger_Guard_Detent"/>
                <part node="Trigger_Guard_Detent_Spring"/>
            </group>
            <group name="Pistol_Grip Group">
                <part node="Pistol_Grip"/>
                <part node="Pistol_Grip_Screw"/>
                <part node="Pistol_Grip_Lock_Washer"/>
            </group>
        </group>
        <group name="Upper_Receiver Group">
            <part node="Upper_Receiver"/>
            <group name="Charging_Handle Group">
                <part node="Charging_Handle"/>
                <part node="Charging_Handle_Latch"/>
                <part node="Charging_Handle_Spring"/>
                <part node="Charging_Handle_Spring_Pin"/>
                <group name="Key_and_Bolt_Carrier_Assembly Group">
                    <part node="Key_and_Bolt_Carrier_Assembly"/>
                    <part node="Firing_Pin_Retaining_Pin"/>
                    <part node="Firing_Pin"/>
                    <group name="Bolt Group">
                        <part node="Bolt"/>
                        <part node="Bolt_Cam_Pin"/>
                        <part node="Ejector_Spring_Pin"/>
                        <part node="Bolt_Ring"/>
                        <part node="Bolt_Ring2"/>
                        <part node="Bolt_Ring1"/>
                        <group name="Ejector Group">
                            <part node="Ejector"/>
                            <part node="Ejector_Spring"/>
                        </group>
                        <group name="Extractor Group">
                            <part node="Extractor"/>
                            <part node="Extractor_Spring"/>
                            <part node="Extractor_Pin"/>
                        </group>
                        <group name="Casing4 Group">
                            <part node="Casing4"/>
                            <part node="Projectile4"/>
                        </group>
                    </group>
                </group>
            </group>
            <group name="Plunger_Assembly Group">
                <part node="Plunger_Assembly"/>
                <part node="Pawl__Forward_Assist"/>
                <part node="Forward_Assist_Spring"/>
                <part node="Forward_Assist_Spring1"/>
                <part node="Pawl_Spring_Pin"/>
                <part node="Pawl_Detent"/>
                <part node="Pawl_Spring"/>
            </group>
            <group name="Cover_Pin Group">
                <part node="Cover_Pin"/>
                <part node="Ejection_Port_Cover"/>
                <part node="Cover_Spring"/>
                <part node="Cover_Retaining_Ring__OOC_Clip__CC"/>
            </group>
            <group name="Gun_Carrying_Handle Group">
                <part node="Gun_Carrying_Handle"/>
                <part node="Windage_Spring_Pin"/>
                <part node="Rear_Sight_Screw"/>
                <part node="Flat_Rear_Sight_Spring"/>
                <part node="Rear_Sight_Base"/>
                <part node="Sight_Aperture"/>
                <part node="Windage_Knob"/>
                <part node="Spring__Helical__Compression"/>
                <part node="Knob"/>
                <part node="Ball_Bearing1"/>
                <part node="Elevating_Mechanism"/>
                <part node="Spring2"/>
                <part node="Spring1"/>
                <part node="Index_Screw"/>
                <part node="Ball_Bearing"/>
                <part node="Pin_Spring"/>
                <part node="Spring"/>
                <part node="Ball_Bearing2"/>
                <part node="Round_Nut1"/>
                <part node="Washer1"/>
                <part node="Washer"/>
                <part node="Clamping_Bar"/>
                <part node="Round_Nut"/>
            </group>
        </group>
    </group>
</grouping>
*/



