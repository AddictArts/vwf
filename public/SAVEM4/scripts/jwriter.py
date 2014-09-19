
'''
reads what would be a "master" collada file and writes out 
the hierarchy in JSON format.  Does not yet save out the 
individual parts as separate dae files.
'''

import sys
import libfind
from math import *
from decimal import *


class Node:

	vect = [0, 0, 0]

	def __init__(self, name):
		self.name = name
		self.translate = ['0', '0', '0']
		self.rotateZ = 0; self.rotateY = 0; self.rotateX = 0
		self.scale = [1, 1, 1]
		self.children = []
		self.parent = "root"
		self.Materials = []
		self.geoRef = ""
		self.level = 0
		self.quaternion = [ 0, 1, 0, 0 ]
		self.rotatePivot = [0, 0, 0]
		self.rotatePivotInverse = [0, 0, 0]
		self.scalePivot = [0, 0, 0]
		self.scalePivotInverse = [0, 0, 0]
		
	def settranslate (self, vect):
		self.translate = vect  
		
	def setrotX (self, rot):
		self.rotateX = rot
		
	def setrotY (self, rot):
		self.rotateY = rot
		
	def setrotZ (self, rot):
		self.rotateZ = rot
	
	def getQuat(self):
		radZ = radians(float(self.rotateZ))
		radY = radians(float(self.rotateY))
		radX = radians(float(self.rotateX))
		c1 = cos(radZ / 2)
		c2 = cos(radX / 2)
		c3 = cos(radY / 2)
		s1 = sin(radZ / 2)
		s2 = sin(radX / 2)
		s3 = sin(radY / 2)
		w = Decimal(c1 * c2 * c3 - s1 * s2 * s3) * Decimal(1)  # multiplying by Decimal(1) forces Decimal to use reduced significant digits
		x = Decimal(s1 * s2 * c3 + c1 * c2 * s3) * Decimal(1)
		y = Decimal(s1 * c2 * c3 + c1 * s2 * s3) * Decimal(1)
		z = Decimal(c1 * s2 * c3 - s1 * c2 * s3) * Decimal(1)
		self.quaternion = [ w, x, y, z ]
	
	def setscale (self, scalevect):
		self.scale = scalevect
		
	def addchild (self, child):
		self.children.append(child)
		
	def setparent (self, parent):
		self.parent = parent
		
	def addMaterial (self, Mat):     # Material instances with 'symbol' and 'target'
		self.Materials.append(Mat)
		
	def addGeoRef (self, geoRef):
		self.geoRef = geoRef
		
	def setlevel (self, level):
		self.level = level

	def set_rotatePivot(self, vect):
		self.rotatePivot = vect
		
	def set_rotatePivotInverse(self, vect):
		self.rotatePivotInverse = vect
		
	def set_scalePivot(self, vect):
		self.scalePivot = vect
		
	def set_scalePivotInverse(self, vect):
		self.scalePivotInverse = vect

class Scene:
	def __init__(self, name):
		self.name = name
		self.children = []
		
	def addchild (self, child):
		self.children.append(child)
		

class Image:
	def __init__(self, id):
		self.id = id
		self.file = ""
		self.contents = []		# probably will go unused

		
	def setfile(self, file):
		self.file = file
		
	def lineadd(self, line):
		self.contents.append(line)


class Effect:		# assuming that each effect can only reference one image - and this will break before long
	def __init__(self, name):
		self.name = name
		self.contents = []
		self.Images = []		# gets instance of Image class
		
	def lineadd(self, line):
		self.contents.append(line)
		
	def addImage(self, Image):
		self.Images.append(Image)	

		
class Material:
	def __init__(self, symbol, target):
		self.id = target
		self.symbol = symbol
		self.Effects = []		# can only be one, but plural cause its a list
		
	def setEffect(self, Effect):
		self.Effects.append(Effect)


class Geom:
	def __init__(self, name):
		self.name = name
		self.contents = []
		self.Materials = []
		
	def lineadd(self, line):
		self.contents.append(line)
		
	def addMaterial(self, Name):
		self.Materials.append(Name)

		
class Data:
	def __init__(self):
		self.datalist = []
		self.parent_nodes = []
		self.idx = 0
		self.Nodes = []		# list of instances of Node class
		self.Vis_Scenes = []	# list of instances of Scene class
		self.Geodes = []	# list of instances of Geom
		self.Materials = []  # list of instances of Material
		self.Images = []
		self.Effects = []
		

	def jsoninit(self, jsonfile):
		self.json = open(jsonfile, "w")
		
	def libread(self, infile, target="<library_visual_scenes>"):
		self.datalist = libfind.fetch(infile, target)
		self.dataLen = len(self.datalist)
		
	def appendScene(self, scene):
		self.Vis_Scenes.append(scene)
		
	def appendNode(self, Node):
		self.Nodes.append(Node)
		
	def appendImage(self, Image):
		self.Images.append(Image)
		
	def appendEffect(self, Effect):
		self.Effects.append(Effect)
		
	def appendMaterial(self, Mat):
		self.Materials.append(Mat)
		
	def popNode(self):
		last = len(self.parent_nodes) - 1
		throwaway = self.parent_nodes.pop(last)
		
	def appendParent(self, name):
		self.parent_nodes.append(name)
		
	def idxBump(self):
		self.idx +=1
		
	def conflictCheck(self):
		nlist = []
		self.totalnodes = len(self.Nodes)
		for idx in range(self.totalnodes):
			ThisNode = self.Nodes[idx]
			name = ThisNode.name
			if (name in nlist):
				print("name conflict in ", name)
				exit(1)
			nlist.append(name)
			
	def makeNode(self, name):
		self.TempNode = Node(name)
		
	def makeScene(self, name):
		self.TempScene = Scene(name)
		
	def cleardata(self):
		self.datalist.clear()
					
					
def floatGlop3(strung):
	pos = strung.rfind('"') + 2
	valglop = strung[pos:]
	pos = valglop.find('</')
	valueString = valglop[:pos]
	a = float(valueString.split()[0])
	b = float(valueString.split()[1])
	c = float(valueString.split()[2])
	floatVals = [a, b, c]
	return floatVals
	
	
def floatGlop4(strange):
	pos = strange.rfind('"') + 2
	valglop = strange[pos:]
	pos = valglop.find('</')
	valueString = valglop[:pos]
	a = float(valueString.split()[0])
	b = float(valueString.split()[1])
	c = float(valueString.split()[2])
	d = float(valueString.split()[3])
	floatVals4 = [a, b, c, d]
	return floatVals4
	
	
def tofloat(values):
	a = float(values[0])
	b = float(values[1])
	c = float(values[2])
	fvect = [a, b, b]
	return fvect

	
def georef(Collada):  
	line = Collada.datalist[Collada.idx]
	#  get shape name
	pos_a = line.find('"') + 1
	stub = line[pos_a:]
	pos_b = stub.find('"')
	geoname = stub[:pos_b]
	Collada.TempNode.addGeoName(geoname)
	# get material
	while ("</instance_geometry>" not in line):
		Collada.idxBump()
		line = Collada.datalist[Collada.idx]
		if ("<instance_material symbol=" in line):
			pos_a = line.find('"') + 1
			stub = line[pos_a:]
			pos_b = stub.find('"')
			matsymbol = stub[:pos_b]
			latterhalf = stub[pos_b:]
			pos_a = latterhalf.find('#') + 1
			latterstub = latterhalf[pos_a:]
			pos_b = latterstub.find('"')
			mattarget = latterstub[:pos_b]
			TempMat = Material(matsymbol, mattarget)
			Collada.TempNode.addMaterial(TempMat)


			
def sceneeval(Collada):
	Collada.idx = 0		# can't use for/in because of lines 357-371
	while (Collada.idx < Collada.dataLen):
		line = Collada.datalist[Collada.idx]
		if ('<visual_scene id=' in line):
			pos = line.find('name="') + 6
			pob = line.rfind('">')
			name = line[pos:pob]      #  we have scene name
			TempScene = Scene(name)		
		if ('</visual_scene>' in line):
			Collada.appendScene(TempScene)
			Collada.appendNode(Collada.TempNode)  #  to write the last node for that scene
	
		if ('<node id="' in line):
			pos = line.find('name="') + 6
			stub = line[pos:]
			pos = stub.find('"')
			name = stub[:pos]
			if (len(TempScene.children) > 0):	# only when first node listed in current scene			
				Collada.appendNode(Collada.TempNode)	# from previous data. only write previous working node when <node> or </visual_scene>
			Collada.makeNode(name)
			depth = len(Collada.parent_nodes)
			if (depth == 0):
				TempScene.addchild(name)
			else:
				parentName = Collada.parent_nodes[depth-1]
				nodes_listlen = len(Collada.Nodes)
				for idx in range(nodes_listlen):
					someNodeName = Collada.Nodes[idx].name
					if (someNodeName == parentName):
						Collada.Nodes[idx].addchild(name)	# Nodes is a list of instance of Node, addchild is its method
			Collada.appendParent(name)    # append to parent_nodes at <node>, pop from parent_nodes at </node>
			Collada.TempNode.setlevel(depth)	# never implemented using this variable yet
			
		if ("</node>" in line):
			Collada.popNode()
			
		if ('<translate sid="translate"' in line):
			fvect = floatGlop3(line)
			Collada.TempNode.settranslate(fvect)
		
		if ('<rotate sid="rotateX' in line):
			fvect4 = floatGlop4(line)
			Collada.TempNode.setrotX(fvect4[3])   # always 4th item in list, and rotations are in degrees, not radians
		
		if ('<rotate sid="rotateY' in line):
			fvect4 = floatGlop4(line)
			Collada.TempNode.setrotY(fvect4[3])
		
		if ('<rotate sid="rotateZ' in line):
			fvect4 = floatGlop4(line)
			Collada.TempNode.setrotZ(fvect4[3])
		
		if ('<scale sid=' in line):
			fvect = floatGlop3(line)
			Collada.TempNode.setscale(fvect)
		
		if ('<translate sid="rotatePivot"' in line):
			fvect = floatGlop3(line)
			Collada.TempNode.set_rotatePivot(fvect)
		
		if ('<translate sid="rotatePivotInverse"' in line):
			fvect = floatGlop3(line)
			Collada.TempNode.set_rotatePivotInverse(fvect)
		
		if ('<translate sid="scalePivot"' in line):
			fvect = floatGlop3(line)
			Collada.TempNode.set_scalePivot(fvect)
			
		if ('<translate sid="scalePivotInverse"' in line):
			fvect = floatGlop3(line)
			Collada.TempNode.set_scalePivotInverse(fvect)	
		
		if ('<instance_geometry url=' in line):
			pos = line.find('#') + 1
			valglop = line[pos:]
			pos = valglop.rfind('">')
			geo = valglop[:pos]
			Collada.TempNode.addGeoRef(geo)
			# get material
			while ("</instance_geometry>" not in line):
				Collada.idxBump()
				line = Collada.datalist[Collada.idx]
				if ("<instance_material symbol=" in line):
					pos_a = line.find('"') + 1
					stub = line[pos_a:]
					pos_b = stub.find('"')
					matsymbol = stub[:pos_b]
					latterhalf = stub[pos_b:]
					pos_a = latterhalf.find('#') + 1
					latterstub = latterhalf[pos_a:]
					pos_b = latterstub.find('"')
					mattarget = latterstub[:pos_b]
					TempMat = Material(matsymbol, mattarget)
					Collada.TempNode.addMaterial(TempMat)
		Collada.idxBump()
	
		
def nodewriter(InNode, thisIndent, Collada):
	indent = thisIndent + '    '	# adds more indent on each recursion
	name = InNode.name
	line = indent + '"' + name + '"' + ': {' + "\n"
	Collada.json.write(line)
	line = indent + '  "extends": "http://vwf.example.com/node3.vwf",' + "\n"
	Collada.json.write(line)
	hasGeo = len(InNode.geoRef)
	chids = InNode.children
	if (hasGeo):
		#  need to add geometry evaluation back into the node eval
		line = indent + '  "type": "model/vnd.collada+xml",' + "\n"
		Collada.json.write(line)
		if (len(chids)>0):
			line = indent + '  "source": "parts/' + InNode.name + '.dae",' + "\n"
			Collada.json.write(line)
		else:		# avoids writing erroneous comma after the "source" line if no children following
			line = indent + '  "source": "parts/' + InNode.name + '.dae"' + "\n"
			Collada.json.write(line)
#	line = indent + '  properties: {' + "\n"
#	Collada.json.write(line)
#	transtext = '[ ' + str(InNode.translate[0]) + ', ' + str(InNode.translate[1]) + ', ' + str(InNode.translate[2]) + ' ],'
#	line = indent + '    translation: ' + transtext + "\n"
#	Collada.json.write(line)
#	InNode.getQuat()
#	w = str(InNode.quaternion[0]); x = str(InNode.quaternion[1]); y = str(InNode.quaternion[2]); z = str(InNode.quaternion[3])
#	rottext = '[ ' + w + ', ' + x + ', ' + y + ', ' + z + ' ],'
#	line = indent + '    rotation: ' + rottext + "\n"
#	Collada.json.write(line)
#	scaletext = '[ ' + str(InNode.scale[0]) + ', ' + str(InNode.scale[1]) + ', ' + str(InNode.scale[2]) + ' ]'
#	line = indent + '    scale: ' + scaletext + "\n"
#	Collada.json.write(line)

#	if (len(chids)>0):
#		line = indent + '},' + "\n"
#		Collada.json.write(line)
#	else:
#		line = indent + '}' + "\n"
#		Collada.json.write(line)

	if (len(chids)>0):
		line = indent + '  "children": {' + "\n"
		Collada.json.write(line)
		for thisChild in chids:		# names in a list from the node
			for ThisNode in Collada.Nodes:	# nodes in a list from the whole Collada
				if (ThisNode.name == thisChild):
					nodewriter(ThisNode, indent, Collada)
		line = indent + '  }' + "\n"
		Collada.json.write(line)
	line = indent + '}' + "\n"
	Collada.json.write(line)  


def json_start(Collada):
	line = "{" + "\n"
	Collada.json.write(line)
	line = "  " + '"extends": "http://vwf.example.com/node3.vwf",' + "\n"
	Collada.json.write(line)
	line = "  " + '"properties": {' + "\n"
	Collada.json.write(line)
	line = "    " + '"translation": [ 0, 0, 2 ],' + "\n"
	Collada.json.write(line)
	line = "    " + '"rotation": [ 0, 0, 1, 90 ],' + "\n"
	Collada.json.write(line)
	line = "    " + '"scale": [ 1, 1, 1 ]' + "\n"
	Collada.json.write(line)
	line = "  " + "}," + "\n"
	Collada.json.write(line)
	line = "  " + '"children": {' + "\n"
	Collada.json.write(line)
	
	
		
		
def imageryparse(Collada):
	for idx in range(Collada.dataLen):
		line = Collada.datalist[idx]
		if ('<image id="' in line):
			pos_a = line.find('"') + 1
			stub = line[pos_a:]
			pos_b = stub.find('"')
			img_id = stub[:pos_b]
			TempImage = Image(img_id)
		if ('<init_from>' in line):
			pos_a = line.find('>') + 1
			stub = line[pos_a:]
			pos_b = stub.find('</')
			fileref = stub[:pos_b]
			TempImage.setfile(fileref)
		if ('</image>' in line):
			Collada.appendImage(TempImage)

			
def effectparse(Collada):
	for idx in range(Collada.dataLen):
		line = Collada.datalist[idx]
		written = 0
		if ('<effect id="' in line):
			written = 1
			pos_a = line.find('"') + 1
			stub = line[pos_a:]
			pos_b = stub.find('"')
			effname = stub[:pos_b]
			TempEffect = Effect(effname)
			TempEffect.lineadd(line)
		if ('<init_from>' in line):
			written = 1
			pos_a = line.find('>')
			stub = line[pos_a:]
			pos_b = stub.find('</')
			imgref = stub[:pos_b]
			for thisImage in Collada.Images:
				if (thisImage.id == imgref):
					TempEffect.addImage(thisImage)
			TempEffect.lineadd(line)
		if ('</effect>' in line):
			written = 1
			TempEffect.lineadd(line)
			Collada.appendEffect(TempEffect)
		if ('<library_effects>' not in line) and ('</library_effects>' not in line) and (not written):	
			TempEffect.lineadd(line)
		

def matparse(Collada):
	for idx in range(Collada.dataLen):
		line = Collada.datalist[idx]
		if ('<material id="' in line):
			pos_a = line.find('"') + 1
			stub = line[pos_a:]
			pos_b = stub.find('"')
			mat_id = stub[:pos]
			Tempmat = Material(matname)
		if ('<instance_effect url="' in line):
			pos_a = line.find('#') + 1
			stub = line[pos:]
			pos_b = stub.find('"')
			effname = stub[:pos]
			for thisEffect in Collada.Effects:
				if (thisEffect.name == effname):
					Tempmat.setEffect(thisEffect)
			Tempmat.seteffect(name)
		if ('</material>' in line):
			Collada.appendMaterial(Tempmat)
		
		
def georead(Collada):	#  very unfinished
	for idx in range(Collada.dataLen):
		line = Collada.datalist[idx]
		if ('<geometry id=' in line):
			pos_a = line.find('"')
			stub = line[pos_a:]
			pos_b = stub.find('"')
			geoname = stub[:pos_b]
			TempGeo = Geom(geoname)
		if ('material="' in line):
			pos_a = line.find('"')
			stub = line[pos_a:]
			pos_b = stub.find('"')
			matnameStart = stub[:pos_b]
	

def notDoingThis(Collada):
	tgt = "<library_images>"
	Collada.libread(infile, tgt)
	imageryparse(Collada)
	Collada.cleardata()
	tgt = "<library_effects>"
	Collada.libread(infile, tgt)
	effectparse(Collada)
	Collada.cleardata()
	tgt = "<library_materials>"
	Collada.libread(infile, tgt)
	matparse(Collada)
	Collada.cleardata()
	tgt = '<library_geometries>'
	Collada.libread(infile, tgt)
	georead(Collada)
	
def main():
	getcontext().prec = 8	# Decimal makes numbers a little more readable, in this case using 8 significant digits
	infile = str(sys.argv[1])
	position = infile.find(".dae")
	jsonFile = infile[:position] + ".json"
	Collada = Data()
#	notDoingThis(Collada)   # parsing images, effects, materials, geometry, other fun stuff
	
	tgt = "<library_visual_scenes>"
	Collada.libread(infile, tgt)
	sceneeval(Collada)
#	Collada.cleardata()		# list.clear() is supposed to del all contents, but appears broken.
	Collada.conflictCheck()
	Collada.jsoninit(jsonFile)
	

	indent = ""
	for ThisScene in Collada.Vis_Scenes:
		numTopNodes = len(ThisScene.children)
		for idx in range(numTopNodes):
			kid = ThisScene.children[idx]
			for ThisNode in Collada.Nodes:
				if (ThisNode.name == kid):
					nodewriter(ThisNode, indent, Collada)
					
					
if __name__== "__main__":
	main()

		
