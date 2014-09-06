
def findtags(glob, lib, endtag):
	inmark = 0
	outmark = 0
	glen = len(glob)
	for i in range(glen):
		jack = glob[i]
		if (lib in jack):
			inmark = i
		if (endtag in jack):
			outmark = i+1   #  python sets drop the specified end element, so have to add 1 to include end element
	return (inmark, outmark)
			

def fetch(infile, lib):
	lab = lib.strip('<>')
	endtag = "</" + lab + ">"
	with open(infile, 'r') as f:
		glob = f.readlines()
	f.close()
	a, b = findtags(glob, lib, endtag)
	libset = glob[a:b]
	return libset		
	